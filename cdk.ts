import { Toolkit } from "@aws-cdk/toolkit-lib";
import type { AssemblyBuilder } from "@aws-cdk/toolkit-lib";
import * as core from "aws-cdk-lib/core";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as batch from "aws-cdk-lib/aws-batch";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as events from "aws-cdk-lib/aws-events";
import * as eventst from "aws-cdk-lib/aws-events-targets";

const outdir = new URL("./cdk.out", import.meta.url).pathname;

async function app(): ReturnType<AssemblyBuilder> {
  const app = new core.App({ outdir });

  const stack = new core.Stack(app, "SlackTrigger", {
    env: {
      account: process.env["AWS_ACCOUNT"],
      region: process.env["AWS_REGION"],
    },
  });

  const vpc = new ec2.Vpc(stack, "Vpc", {
    maxAzs: 1,
    subnetConfiguration: [
      {
        name: "public",
        subnetType: ec2.SubnetType.PUBLIC,
      },
    ],
  });

  const fargate = new batch.FargateComputeEnvironment(stack, "Fargate", {
    vpc,
    vpcSubnets: vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
    }),
  });

  const queue = new batch.JobQueue(stack, "JobQueue", {
    computeEnvironments: [
      {
        computeEnvironment: fargate,
        order: 0,
      },
    ],
  });

  const cron = new events.Rule(stack, "Cron", {
    schedule: events.Schedule.cron({
      hour: "0", // JST: 900
      minute: "0",
    }),
  });

  const image = ecs.ContainerImage.fromAsset(new URL(".", import.meta.url).pathname, {
    // Labor costs are higher!!
    // platform: ecra.Platform.LINUX_ARM64,
  });

  type Param = [["before" | "after", `${number}`], string];
  const params: Param[] = [
    [["after", "21"], "/slack-trigger/21url"],
    [["before", "31"], "/slack-trigger/31url"],
  ];

  for (const [command, parameterName] of params) {
    const name = command.join("");
    const urlRef = ssm.StringParameter.fromSecureStringParameterAttributes(stack, `UrlRef${name}`, {
      parameterName,
    });

    const container = new batch.EcsFargateContainerDefinition(stack, `BatchContainer${name}`, {
      // fargateCpuArchitecture: ecs.CpuArchitecture.ARM64,
      image,
      cpu: 0.25,
      memory: core.Size.mebibytes(512),
      command,
      secrets: {
        SLACK_WF_URL: batch.Secret.fromSsmParameter(urlRef),
      },
      assignPublicIp: true,
    });

    const def = new batch.EcsJobDefinition(stack, `JobDefinition${name}`, {
      container,
    });

    const launcherDef = new tasks.BatchSubmitJob(stack, `SubmitJob${name}`, {
      jobName: name,
      jobDefinitionArn: def.jobDefinitionArn,
      jobQueueArn: queue.jobQueueArn,
    });

    const launcher = new sfn.StateMachine(stack, `Launcher${name}`, {
      definitionBody: sfn.DefinitionBody.fromChainable(launcherDef),
    });

    cron.addTarget(new eventst.SfnStateMachine(launcher));
  }

  return app.synth();
}

const [op] = process.argv.slice(2);

switch (op) {
  case "synth":
  case "diff":
  case "deploy":
  case "destroy":
    break;

  default:
    throw new Error(`Not implemented: ${op}`);
}

const tk = new Toolkit();
const source = op === "synth" ?
  await tk.fromAssemblyBuilder(app) :
    await tk.fromAssemblyDirectory(outdir);

switch (op) {
  case "synth":
    tk.synth(source);
    break;

  case "diff":
    tk.diff(source);
    break;

  case "deploy":
    tk.deploy(source);
    break;

  case "destroy":
    tk.destroy(source);
    break;
}
