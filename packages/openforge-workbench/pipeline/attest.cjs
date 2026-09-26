#!/usr/bin/env node
'use strict';
/** Conclude the GENERATED SAMPLE APP's Windows acceptance with verifiable evidence.
 * Does not certify the OpenForge IDE, AI correctness, independent security or signing.
 */
const fs=require('node:fs');const crypto=require('node:crypto');const path=require('node:path');
const args=process.argv.slice(2);const arg=(name)=>{const n=args.indexOf('--'+name);if(n<0||!args[n+1])throw Error('Missing --'+name);return args[n+1]};
function attest({jobFile,evidenceFile,installerFile,outputFile}){
  const job=JSON.parse(fs.readFileSync(jobFile,'utf8'));
  const evidence=JSON.parse(fs.readFileSync(evidenceFile,'utf8'));
  if(job.status!=='awaiting-windows-acceptance')throw Error('Build pipeline did not reach installer acceptance stage');
  const installer=job.artifacts?.find(a=>a.type==='windows-nsis-installer');if(!installer)throw Error('Windows installer missing from build manifest');
  if(evidence.pass!==true)throw Error('Windows acceptance did not pass');
  for(const name of ['installation','installedExecutable','noDevelopmentRuntimeInPath','bundledRuntime','normalLaunch']){
    if(evidence.tests?.[name]!=='passed')throw Error('Required clean install test missing: '+name);
  }
  const actual=crypto.createHash('sha256').update(fs.readFileSync(installerFile)).digest('hex');
  if(actual.toLowerCase()!==String(installer.sha256).toLowerCase()||actual.toLowerCase()!==String(evidence.installerSha256).toLowerCase())throw Error('Installer checksum does not match build and acceptance evidence');
  const record={kind:'reference-generated-app',status:'pass',acceptedAt:new Date().toISOString(),installerSha256:actual,tests:evidence.tests,scope:'Deterministic standalone Notes fixture only; does not certify arbitrary AI generated applications, the OpenForge IDE, code signing or independent security review.'};
  fs.mkdirSync(path.dirname(outputFile),{recursive:true});fs.writeFileSync(outputFile,JSON.stringify(record,null,2));return record;
}
if(require.main===module){try{const record=attest({jobFile:arg('job'),evidenceFile:arg('evidence'),installerFile:arg('installer'),outputFile:arg('out')});console.log(JSON.stringify(record,null,2));}catch(e){console.error('ACCEPTANCE BLOCKED: '+e.message);process.exitCode=2}}
module.exports={attest};
