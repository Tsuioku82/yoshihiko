'use strict';
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');

const rules = [
  ['github-token', /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['telegram-token', /\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/]
];
function nameRule(name) {
  const clean = name.replaceAll('\\','/');
  if (/(^|\/)秘密のカギ(\/|$)/.test(clean)) return 'secret-folder';
  const base = clean.split('/').pop();
  if (/^\.env(?:\..+)?$/i.test(base) && !/^\.env\.(example|sample|template)$/i.test(base)) return 'env-file';
  if (/\.env$/i.test(base)) return 'env-file';
  if (/^(id_rsa|id_ed25519|credentials\.json)$/i.test(base) || /\.(pem|key)$/i.test(base)) return 'credential-file';
  return null;
}
function contentRule(buffer) {
  const text = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : buffer;
  for (const [name, regex] of rules) if (regex.test(text)) return name;
  return null;
}
function git(args,encoding='utf8') {
  return execFileSync('git',args,{encoding,maxBuffer:128*1024*1024,stdio:['ignore','pipe','pipe']});
}
function safePath(name) {
  let result = name;
  for (const [,regex] of rules) result = result.replace(new RegExp(regex.source,'g'),'[redacted]');
  return JSON.stringify(result);
}
function check(mode, tips=[]) {
  const blocked = [];
  const seen = new Set();
  function inspect(name, object) {
    const pathProblem = nameRule(name);
    if (pathProblem) { blocked.push([name,pathProblem]); return; }
    if (seen.has(object)) return;
    seen.add(object);
    const problem = contentRule(git(['cat-file','blob',object],null));
    if (problem) blocked.push([name,problem]);
  }
  if (mode==='staged') {
    const names=git(['diff','--cached','--name-only','--diff-filter=ACMR','-z']).split('\0').filter(Boolean);
    for (const name of names) inspect(name,':'+name);
  } else {
    const commits=new Set();
    for(const tip of tips) {
      if (!/^(HEAD|[a-fA-F0-9]{40,64})$/.test(tip)) throw new Error('invalid-tip');
      for(const commit of git(['rev-list',tip]).trim().split('\n').filter(Boolean)) commits.add(commit);
    }
    for(const commit of commits) {
      const entries=git(['ls-tree','-r','-z',commit]).split('\0').filter(Boolean);
      for(const entry of entries) {
        const tab=entry.indexOf('\t'),metadata=entry.slice(0,tab).split(' ');
        if(metadata[1]==='blob') inspect(entry.slice(tab+1),metadata[2]);
      }
    }
  }
  return blocked;
}
module.exports={nameRule,contentRule,check};
if(require.main===module) {
  try {
    const mode=process.argv[2]||'staged';
    if(!['staged','history','push'].includes(mode)) throw new Error('invalid-mode');
    let tips=process.argv.slice(3);
    if(mode==='push') {
      const input=fs.readFileSync(0,'utf8');
      tips=input.trim().split(/\r?\n/).filter(Boolean).map(line=>line.split(/\s+/)[1]).filter(sha=>sha&&!/^0+$/.test(sha));
    }
    if(mode==='history'&&!tips.length) tips=['HEAD'];
    const blocked=check(mode,tips);
    if(blocked.length) {
      console.error('Secret check blocked this operation. No secret values are shown.');
      for(const [name,rule]of blocked) console.error(`${safePath(name)}: ${rule}`);
      process.exitCode=1;
    }else console.log('Secret check: OK');
  }catch(_){console.error('Secret check could not complete. Check the repository and Git/Node availability. No credential values are printed.');process.exitCode=1;}
}
