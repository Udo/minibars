'use strict'
// author: udo.schroeter@gmail.com

const Minibars = {
  
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
      return('v'+Minibars.utils.vnCounter++);
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
      label = label.trim();
      if(label[0] == '"' && label[label.length-1] == '"') return(JSON.stringify(label.slice(1, -1)));
      if(label == 'this') return(Minibars.scope);
      if(label[0] == '@') return(label.slice(1));
      let scope = Minibars.scope;
      let upCnt = 0;
      while(label[0] == '.') {
        // access parent scopes with ..
        if(upCnt > 0 && Minibars.stack.length >= upCnt) {
          scope = Minibars.stack[Minibars.stack.length-upCnt];                    
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
      Minibars.stack.push(Minibars.scope);
      Minibars.scope = Minibars.utils.getName();
      return(Minibars.scope);
    },
    
    popScope : function() {
      Minibars.scope = Minibars.stack.pop() || 'data';
      return(Minibars.scope);
    },
    
  },
  
  // helpers are called during runtime, but they need to be defined before compile() is called 
  // because Minibars resolves their name during compile time
  helpers : { 
    
    /* example helper function */
    trim : function(val) {
      return(val.trim())
    },
        
  },
  
  // code generators
  gen : {
    
    if_start : function(token) {
      return('if('+Minibars.utils.field(token.params.trim())+') {');
    },
    
    if_end : function(token) {
      return('}');
    },
    
    unless_start : function(token) {
      return('if(!'+Minibars.utils.field(token.params.trim())+') {');
    },
    
    unless_end : function(token) {
      return('}');
    },
    
    each_start : function(token) {
      const container = Minibars.utils.field(token.params.trim());
      const iterVN = Minibars.utils.getName();
      const scp = Minibars.utils.pushScope();
      return(
        'if('+container+'&&'+container+'.length>0) '+
        'for(let '+iterVN+'=0;'+iterVN+'<'+container+'.length;'+iterVN+'++) {'+
        'const index='+iterVN+';'+
        'const '+scp+'='+container+'['+iterVN+'];');
    },
    
    each_end : function(token) {
      Minibars.utils.popScope();
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
      const container = Minibars.utils.field(token.params.trim());
      const iterVN = Minibars.utils.getName();
      const keyVN = Minibars.utils.getName();
      const scp = Minibars.utils.pushScope();
      return(
        'let '+keyVN+'=Object.keys('+container+');'+
        'if('+container+'&&'+keyVN+'.length>0) '+
        'for(let '+iterVN+'=0; '+iterVN+'<'+keyVN+'.length;'+iterVN+'++) {'+
        'const index='+iterVN+';'+
        'const key='+keyVN+'['+iterVN+'];'+
        'const '+scp+'='+container+'[key];'+
        Minibars.gen.local_mapping(token, [scp, 'key']));
    },
    
    properties_end : function(token) {
      Minibars.utils.popScope();
      return('}');
    },
    
    with_start : function(token) {
      const container = Minibars.utils.field(token.params.trim());
      const scp = Minibars.utils.pushScope();
      return(
        'if('+container+') { '+
        'const '+scp+'='+container+';'+
        Minibars.gen.local_mapping(token, [scp]));
    },
    
    with_end : function(token) {
      Minibars.utils.popScope();
      return('}');
    },
    
    'else' : function(token) {
      return('} else {');
    },
    
    log : function(token) {
      return('console.log(Minibars.utils.safe('+Minibars.utils.field(token.params)+'));');
    },
    
    _text_f : function(token) {
      return('output += '+JSON.stringify(token.val)+';');
    },
    
    _field_f : function(token) {
      if(token.block == 'start' || token.block == 'end') {
        const genKey = token.val+'_'+token.block;
        if(Minibars.gen[genKey])
          return(Minibars.gen[genKey](token));
        else {
          console.log('unrecognized field type', genKey);
          return('');
        }
      }
      if(Minibars.gen[token.val])
        return(Minibars.gen[token.val](token));
      if(Minibars.helpers[token.val])
        return('output += Minibars.utils.'+
          (token.raw ? 'unsafe' : 'safe')+
          '(Minibars.helpers['+JSON.stringify(token.val)+']('+Minibars.utils.field(token.params)+
          ', '+Minibars.utils.field('this')+', '+JSON.stringify(token.params)+', data));');
      else {
        return('output += Minibars.utils.'+
          (token.raw ? 'unsafe' : 'safe')+
          '('+Minibars.utils.field(token.val)+');');
      }
    },
    
  },
  
  tokensToCode : function(tokens) {
    const code = [];
    
    tokens.forEach(function(t) {
      const handler = Minibars.gen['_'+t.type+'_f'];
      if(typeof handler != 'function')
        console.log('unrecognized field type', t.type);
      else
        code.push(handler(t));
    });
    
    return(code.join("\n"));
  },
  
  compile : function(text) {
    Minibars.stack = [];
    Minibars.scope = 'data';
    const tokens = Minibars.tokenize(text);
    const code = Minibars.tokensToCode(tokens);
    //console.log('code', code);
    if(Minibars.stack.length != 0) {
      const e = function() { return('template error: un-closed blocks'); };
      e.error = e();
      return(e);      
    } else {
      // straight-up string concat seems to be the fastest option
      return(eval('(function(data) { "use strict"; let output = ""; '+code+' return(output); })'));
    }
  },
  
}