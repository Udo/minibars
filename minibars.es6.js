'use strict';
// author: udo.schroeter@gmail.com
// caution: right now this only works on Chrome!

const _m = {
  
  scope : 'data',
  stack : [],
  
  tokenize : function(text) {
    const tokens = [];
    for(let i = 0; i < text.length; i++) {
      const tkPos = text.indexOf('{{', i);
      if(tkPos === -1) {
        tokens.push({ type : 'text', val : text.slice(i) });
        i = text.length;
      } 
      else {
        const rawField = text.substr(tkPos, 3) == '{{{';
        const closeBy = '}}' + (rawField ? '}' : '');
        const tkEnd = text.indexOf(closeBy, tkPos);
        if(tkEnd === -1) {
          tokens.push({ type : 'text', val : text.slice(i) });
          i = text.length;
        } else {
          if(i < tkPos)
            tokens.push({ type : 'text', val : text.slice(i, tkPos) });
            
          const token = { 
            type : 'field', 
            raw : rawField, 
            val : text.slice(tkPos+closeBy.length, tkEnd), 
            };
            
          const delimHS = token.val.indexOf(' ');
          if(delimHS !== -1) {
            token.params = token.val.slice(delimHS+1);
            token.val = token.val.slice(0, delimHS);
            const delimMap = token.params.indexOf('|');
            if(delimMap !== -1) {
              token.mapTo = token.params.slice(delimMap+1).trim().split(' ');
              token.params = token.params.slice(0, delimMap);
            }
          }

          const prefix = token.val.substr(0, 1);
          if(prefix === '#') {
            token.block = 'start';
            token.val = token.val.slice(1);
          }
          else if(prefix === '/') {
            token.block = 'end';
            token.val = token.val.slice(1);
          }
          
          tokens.push(token);
          i = tkEnd + closeBy.length - 1;
        }
      }
    }
    return(tokens);
  },
  
  utils : {
    
    vnCounter : 0,
    getName : function() {
      return('v'+_m.utils.vnCounter++);
    },
      
    safe : function(raw) {
      if(raw == null) raw = '';
      return((raw +'').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;'));
    },
    
    unsafe : function(raw) {
      return(raw || '');
    },
    
    // resolve field from label at compile time
    field : function(label) {
      label = (label || '').trim();
      if(label[0] == '"' && label[label.length-1] == '"') return(JSON.stringify(label.slice(1, -1)));
      if(label == 'this') return(_m.scope);
      if(label[0] == '@') return(label.slice(1));
      let scope = _m.scope;
      let upCnt = 0;
      while(label[0] == '.') {
        // access parent scopes with ..
        if(upCnt > 0 && _m.stack.length >= upCnt) {
          scope = _m.stack[_m.stack.length-upCnt];                    
        }
        upCnt++;
        label = label.slice(1);
      }
      const levels = label.split('.');
      let acc = '';
      levels.forEach(function(fn) {
        if(fn[0] == '/') fn = fn.slice(1);
        acc += '['+JSON.stringify(fn)+']';
      });      
      return(scope+acc);
    },
    
    pushScope : function() {
      _m.stack.push(_m.scope);
      _m.scope = _m.utils.getName();
      return(_m.scope);
    },
    
    popScope : function() {
      _m.scope = _m.stack.pop() || 'data';
      return(_m.scope);
    },
    
  },
  
  // helpers are called during runtime, but they need to be defined before compile() is called 
  // because _m resolves their name during compile time
  helpers : { 
    
    /* example helper function */
    trim : function(val, container, fieldName, rootContext) {
      return(val.trim())
    },
        
  },
  
  // code generators
  gen : {
    
    if_start : function(token) {
      return('if('+_m.utils.field(token.params.trim())+') {');
    },
    
    if_end : function(token) {
      return('}');
    },
    
    unless_start : function(token) {
      return('if(!'+_m.utils.field(token.params.trim())+') {');
    },
    
    unless_end : function(token) {
      return('}');
    },
    
    each_start : function(token) {
      const container = _m.utils.field(token.params.trim());
      const iterVN = _m.utils.getName();
      const scp = _m.utils.pushScope();
      return(
        'if('+container+'&&'+container+'.length>0) '+
        'for(let '+iterVN+'=0;'+iterVN+'<'+container+'.length;'+iterVN+'++) {'+
        'const index='+iterVN+';'+
        'const '+scp+'='+container+'['+iterVN+'];');
    },
    
    each_end : function(token) {
      _m.utils.popScope();
      return('}');
    },
    
    local_mapping : function(token, tm) {
      if(token.mapTo && token.mapTo.length > 0) {
        let mapCode = '';
        for(let i = 0; i < token.mapTo.length; i++) {
          const alias = token.mapTo[i];
          const v = tm[i];
          if(alias && v)
            mapCode += 'const '+alias+' = '+v+';'; 
        }
        return(mapCode);
      } else {
        return('');
      }
    },
    
    properties_start : function(token) {
      const container = _m.utils.field(token.params.trim());
      const iterVN = _m.utils.getName();
      const keyVN = _m.utils.getName();
      const scp = _m.utils.pushScope();
      return(
        'let '+keyVN+'=Object.keys('+container+');'+
        'if('+container+'&&'+keyVN+'.length>0) '+
        'for(let '+iterVN+'=0; '+iterVN+'<'+keyVN+'.length;'+iterVN+'++) {'+
        'const index='+iterVN+';'+
        'const key='+keyVN+'['+iterVN+'];'+
        'const '+scp+'='+container+'[key];'+
        _m.gen.local_mapping(token, [scp, 'key']));
    },
    
    properties_end : function(token) {
      _m.utils.popScope();
      return('}');
    },
    
    with_start : function(token) {
      const container = _m.utils.field(token.params.trim());
      const scp = _m.utils.pushScope();
      return(
        'if('+container+') { '+
        'const '+scp+'='+container+';'+
        _m.gen.local_mapping(token, [scp]));
    },
    
    with_end : function(token) {
      _m.utils.popScope();
      return('}');
    },
    
    'else' : function(token) {
      return('} else {');
    },
    
    log : function(token) {
      return('console.log(_m.utils.safe('+_m.utils.field(token.params)+'));');
    },
    
    _text_f : function(token) {
      return('output += '+JSON.stringify(_m.opt.trim ? token.val.trim() : token.val)+';');
    },
    
    _invoke_synth : function(ct, token) {
      return('output += _m.utils.'+
        (token.raw ? 'unsafe' : 'safe')+
        '('+ct+'['+JSON.stringify(token.val)+']('+_m.utils.field(token.params || 'this')+
        ', '+_m.utils.field('this')+', '+JSON.stringify(token.params)+', data));');
    },
    
    _field_f : function(token, opt) {
      if(token.block == 'start' || token.block == 'end') {
        const genKey = token.val+'_'+token.block;
        if(_m.gen[genKey])
          return(_m.gen[genKey](token));
        else {
          console.log('unrecognized field type', genKey);
          return('');
        }
      }
      if(_m.gen[token.val])
        return(_m.gen[token.val](token));
      if(_m.helpers[token.val])
        return(_m.gen._invoke_synth('_m.helpers', token));
      else if(typeof opt[token.val] == 'function')
        return(_m.gen._invoke_synth('opt', token));
      else {
        return('output += _m.utils.'+
          (token.raw ? 'unsafe' : 'safe')+
          '('+_m.utils.field(token.val)+');');
      }
    },
    
  },
  
  tokensToCode : function(tokens, opt) {
    const code = [];
    
    tokens.forEach(function(t) {
      const handler = _m.gen['_'+t.type+'_f'];
      if(typeof handler != 'function')
        console.log('unrecognized field type', t.type);
      else
        code.push(handler(t, opt));
    });
    
    return(code.join("\n"));
  },
  
  compile : function(text, opt) {
    if(!opt) opt = {};
    _m.opt = opt;
    _m.stack = [];
    _m.scope = 'data';
    const tokens = _m.tokenize((text || '').trim());
    const code = _m.tokensToCode(tokens, opt);
    //console.log('code', code);
    if(_m.stack.length != 0) {
      const e = function() { return('template error: un-closed blocks'); };
      e.error = e();
      return(e);      
    } else {
      // straight-up string concat seems to be the fastest option
      return(eval('(function(data) { "use strict"; if(!data) data = {}; let output = ""; '+code+' return(output); })'));
    }
  },
  
}

const Minibars = _m;