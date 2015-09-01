// author: udo.schroeter@gmail.com

Minibars = {
  
  scope : 'data',
  stack : [],
  
  tokenize : function(text) {
    var tokens = [];
    for(var i = 0; i < text.length; i++) {
      var tkPos = text.indexOf('{{', i);
      if(tkPos === -1) {
        tokens.push({ type : 'text', val : text.slice(i) });
        i = text.length;
      } 
      else {
        var rawField = text.substr(tkPos, 3) == '{{{';
        var closeBy = '}}' + (rawField ? '}' : '');
        var tkEnd = text.indexOf(closeBy, tkPos);
        if(tkEnd === -1) {
          tokens.push({ type : 'text', val : text.slice(i) });
          i = text.length;
        } else {
          if(i < tkPos)
            tokens.push({ type : 'text', val : text.slice(i, tkPos) });
            
          var token = { 
            type : 'field', 
            raw : rawField, 
            val : text.slice(tkPos+closeBy.length, tkEnd), 
            };
            
          var delimHS = token.val.indexOf(' ');
          if(delimHS !== -1) {
            token.params = token.val.slice(delimHS+1);
            token.val = token.val.slice(0, delimHS);
            var delimMap = token.params.indexOf('|');
            if(delimMap !== -1) {
              token.mapTo = token.params.slice(delimMap+1).trim().split(' ');
              token.params = token.params.slice(0, delimMap);
            }
          }

          var prefix = token.val.substr(0, 1);
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
      var scope = Minibars.scope;
      var upCnt = 0;
      while(label[0] == '.') {
        // access parent scopes with ..
        if(upCnt > 0 && Minibars.stack.length >= upCnt) {
          scope = Minibars.stack[Minibars.stack.length-upCnt];                    
        }
        upCnt++;
        label = label.slice(1);
      }
      var levels = label.split('.');
      var acc = '';
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
    trim : function(val, container, fieldName, rootContext) {
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
      var container = Minibars.utils.field(token.params.trim());
      var iterVN = Minibars.utils.getName();
      var scp = Minibars.utils.pushScope();
      return(
        'if('+container+'&&'+container+'.length>0) '+
        'for(var '+iterVN+'=0;'+iterVN+'<'+container+'.length;'+iterVN+'++) {'+
        'var index='+iterVN+';'+
        'var '+scp+'='+container+'['+iterVN+'];');
    },
    
    each_end : function(token) {
      Minibars.utils.popScope();
      return('}');
    },
    
    local_mapping : function(token, tm) {
      if(token.mapTo && token.mapTo.length > 0) {
        var mapCode = '';
        for(var i = 0; i < token.mapTo.length; i++) {
          var alias = token.mapTo[i];
          var v = tm[i];
          if(alias && v)
            mapCode += 'var '+alias+' = '+v+';'; 
        }
        return(mapCode);
      } else {
        return('');
      }
    },
    
    properties_start : function(token) {
      var container = Minibars.utils.field(token.params.trim());
      var iterVN = Minibars.utils.getName();
      var keyVN = Minibars.utils.getName();
      var scp = Minibars.utils.pushScope();
      return(
        'var '+keyVN+'=Object.keys('+container+');'+
        'if('+container+'&&'+keyVN+'.length>0) '+
        'for(var '+iterVN+'=0; '+iterVN+'<'+keyVN+'.length;'+iterVN+'++) {'+
        'var index='+iterVN+';'+
        'var key='+keyVN+'['+iterVN+'];'+
        'var '+scp+'='+container+'[key];'+
        Minibars.gen.local_mapping(token, [scp, 'key']));
    },
    
    properties_end : function(token) {
      Minibars.utils.popScope();
      return('}');
    },
    
    with_start : function(token) {
      var container = Minibars.utils.field(token.params.trim());
      var scp = Minibars.utils.pushScope();
      return(
        'if('+container+') { '+
        'var '+scp+'='+container+';'+
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
      return('output += '+JSON.stringify(Minibars.opt.trim ? token.val.trim() : token.val)+';');
    },
    
    _field_f : function(token) {
      if(token.block == 'start' || token.block == 'end') {
        var genKey = token.val+'_'+token.block;
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
    var code = [];
    
    tokens.forEach(function(t) {
      var handler = Minibars.gen['_'+t.type+'_f'];
      if(typeof handler != 'function')
        console.log('unrecognized field type', t.type);
      else
        code.push(handler(t));
    });
    
    return(code.join("\n"));
  },
  
  compile : function(text, opt) {
    if(!opt) opt = {};
    Minibars.opt = opt;
    Minibars.stack = [];
    Minibars.scope = 'data';
    var tokens = Minibars.tokenize(text.trim());
    var code = Minibars.tokensToCode(tokens);
    //console.log('code', code);
    if(Minibars.stack.length != 0) {
      var e = function() { return('template error: un-closed blocks'); };
      e.error = e();
      return(e);      
    } else {
      // straight-up string concat seems to be the fastest option
      return(eval('(function(data) { "use strict"; var output = ""; '+code+' return(output); })'));
    }
  },
  
}