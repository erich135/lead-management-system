import {useEffect, useState} from 'react';
export interface DeliveryLookupOption {id:string;label:string;branchId?:string;}
export interface DeliveryLookupProps {
 label:string;value:string;selected:boolean;disabled?:boolean;
 search:(query:string)=>Promise<DeliveryLookupOption[]>;
 onChange:(value:string)=>void;onSelect:(option:DeliveryLookupOption)=>void;
}
/** Results belong to one query. Cleanup prevents old responses replacing newer matches. */
export function DeliveryLookup({label,value,selected,disabled,search,onChange,onSelect}:DeliveryLookupProps) {
 const [result,setResult]=useState<{query:string;options:DeliveryLookupOption[];loading:boolean;error:string}>({query:'',options:[],loading:false,error:''});
 useEffect(()=>{
  let active=true;
  if(disabled||selected||!value.trim()){setResult({query:value,options:[],loading:false,error:''});return;}
  setResult({query:value,options:[],loading:true,error:''});
  void search(value.trim()).then(options=>{if(active)setResult({query:value,options,loading:false,error:''})}).catch(e=>{if(active)setResult({query:value,options:[],loading:false,error:e instanceof Error?e.message:'Search failed. Try again.'})});
  return ()=>{active=false};
 },[value,selected,disabled,search]);
 const visible=!disabled&&!selected&&!!value.trim()&&result.query===value;
 return <div><input aria-label={label} role="combobox" aria-autocomplete="list" aria-expanded={visible&&result.options.length>0} className="border border-slate-300 rounded-lg p-2 text-sm w-full" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}/>
  {visible&&<div className="border border-slate-200 rounded-lg" aria-label={`${label} matches`}>
   {result.loading?<p role="status">Searching...</p>:result.error?<p role="alert">{result.error}</p>:result.options.length?<div role="listbox" aria-label={`${label} results`}>{result.options.map(option=><button type="button" role="option" aria-selected={false} className="block text-left w-full p-2 hover:bg-blue-50" key={option.id} onClick={()=>onSelect(option)}>{option.label}</button>)}</div>:<p role="status">No matches found.</p>}
  </div>}
 </div>;
}
