import { Toolkit } from "@aws-cdk/toolkit-lib";
import type { AssemblyBuilder } from "@aws-cdk/toolkit-lib";
import * as core from "aws-cdk-lib/core";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as batch from "aws-cdk-lib/aws-batch";

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

  const container = new batch.EcsFargateContainerDefinition(stack, "BatchContainer", {
    image: ecs.ContainerImage.fromAsset(new URL(".", import.meta.url).pathname),
    cpu: 0.25,
    memory: core.Size.mebibytes(512),
    command: [
      "before",
      "26",
      "http://example.com/",
    ],
    assignPublicIp: true,
  });

  const def = new batch.EcsJobDefinition(stack, "JobDefinition", {
    container,
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

  new core.CfnOutput(stack, "JobDefinitionArn", {
    value: def.jobDefinitionArn,
  });

  new core.CfnOutput(stack, "JobQueueArn", {
    value: queue.jobQueueArn,
  });

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
