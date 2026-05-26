.PHONY: synth diff deploy destroy

cdk := node --env-file-if-exists=.env ./cdk.ts

synth:
	$(cdk) synth

diff:
	$(cdk) diff

deploy:
	$(cdk) deploy

destroy:
	$(cdk) destroy
