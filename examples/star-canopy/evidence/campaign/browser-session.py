"""Interactive QA transport using the repository's configured official Stagehand MCP client."""
import sys,json
from pathlib import Path
out=Path(__file__).resolve().parent
sys.path.insert(0,str(out.parents[3]/'studio/tools'))
from playcheck_browser import MCP
client=MCP()
print('STAGEHAND_READY',flush=True)
try:
    for line in sys.stdin:
        item=json.loads(line)
        if item.get('close'):break
        if item.get('script'):item['code']=(out/item['script']).read_text()
        try:
            raw=client.call('tools/call',{'name':'run','arguments':{'code':item['code']}})
            strings=[part['text'] for part in raw.get('content',[]) if part.get('type')=='text']
            answer={'isError':raw.get('isError',False),'texts':strings}

        except Exception as exc:answer={'error':str(exc)}
        with (out/'actions.jsonl').open('a') as log:log.write(json.dumps({'request':item,'response':answer},ensure_ascii=False)+'\n')
        print(json.dumps(answer,ensure_ascii=False),flush=True)
finally:client.close()
