/* Universal response quality and free chat model ranking.
 * A blank/classifier output is not a chat answer.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RPG24_AI_QUALITY=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const NOT_CHAT=/(?:content[-_\s]?safety|safety[-_\s]?classifier|(?:^|[/\s_-])(guard|moderation|classifier|embedding|rerank|reward[-_\s]?model|shield)(?:$|[/\s_-]))/i;
 const PLACEHOLDERS=/^(?:(?:null|undefined|none|n\/a|nan|empty|no content|sem resposta|sem conte[uú]do)|(?:user|assistant|prompt|content)\s+safety\s*[:=-]\s*(?:safe|unsafe|benign|unknown|0|1)|(?:safety|policy)\s*(?:classification|label|score)?\s*[:=-]\s*(?:safe|unsafe|benign|unknown|0|1)|\{\s*\})[.! ]*$/i;
 const classifierOnly=/^(?:(?:user|assistant|prompt|content)\s+safety\s*[:=-]\s*(?:safe|unsafe|benign|unknown|0|1)\s*)+$/i;
 function validAnswer(value){
  const text=typeof value==='string'?value.trim():'';
  if(!text)return false;
  return !PLACEHOLDERS.test(text)&&!classifierOnly.test(text);
 }
 function messageText(message){
  if(!message||typeof message!=='object')return '';
  if(typeof message.content==='string')return message.content.trim();
  if(!Array.isArray(message.content))return '';
  return message.content.map(part=>{
   if(typeof part==='string')return part;
   if(part&&part.type==='text'&&typeof part.text==='string')return part.text;
   return '';
  }).filter(Boolean).join('\n').trim();
 }
 function completion(raw){
  const choice=raw?.choices?.[0];
  const text=messageText(choice?.message);
  const model=typeof raw?.model==='string'?raw.model:'';
  return {ok:validAnswer(text),answer:validAnswer(text)?text:'',model,
    reason:text?'Modelo devolveu somente uma classificação ou texto inválido.':'Modelo devolveu resposta vazia ou nula.'};
 }
 function freeCandidate(entry){
  if(!entry||typeof entry!=='object'||typeof entry.id!=='string'||!entry.id.endsWith(':free')||NOT_CHAT.test(entry.id+' '+(entry.name||'')))return false;
  const price=entry.pricing||{};
  if(price.prompt==null||price.completion==null)return false;
  if(Number(price.prompt)!==0||Number(price.completion)!==0)return false;
  const architecture=entry.architecture||{};
  if(Array.isArray(architecture.output_modalities)&&!architecture.output_modalities.includes('text'))return false;
  if(Array.isArray(architecture.input_modalities)&&!architecture.input_modalities.includes('text'))return false;
  return true;
 }
 function qualityScore(model){
  const id=String(model.id||'').toLowerCase();
  const name=String(model.name||'').toLowerCase();
  let n=0;
  if(/(?:instruct|chat)/.test(id+' '+name))n+=75;
  if(/(?:qwen|llama|gemini|mistral|minimax|deepseek|gpt|glm|solar|command)/.test(id))n+=25;
  if(/(?:reason|thinking|^.*\/r1(?:-|:)|nemotron-3-super|nemotron-3-ultra)/.test(id))n-=25;
  if((Number(model.context_length)||0)>=32000)n+=5;
  return n;
 }
 function rankFreeModels(data){
  const rows=Array.isArray(data)?data:[];
  return rows.filter(freeCandidate).sort((a,b)=>qualityScore(b)-qualityScore(a)||a.id.localeCompare(b.id))
   .map(x=>({id:x.id,name:String(x.name||x.id).slice(0,110)})).slice(0,100);
 }
 function fallbackModels(selected,available,max=3){
  const ordered=[selected,...(Array.isArray(available)?available:[]).filter(x=>x&&x.id!=='openrouter/free').map(x=>x.id),'openrouter/free'];
  const valid=id=>id==='openrouter/free'||(Array.isArray(available)&&available.some(x=>x.id===id&&id.endsWith(':free')));
  return [...new Set(ordered.filter(id=>typeof id==='string'&&valid(id)))].slice(0,max);
 }
 return {validAnswer,messageText,completion,freeCandidate,qualityScore,rankFreeModels,fallbackModels};
});