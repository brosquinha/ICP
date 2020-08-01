/* ************************************************************************
************************* Page Creation Interface *************************
* Page Creation Interface (ICP) is a helping tool developed by Thales César for creating new articles in Star Wars Wiki em Português.
* It consists on a modal window that simplifies the article-creation process into a step-by-step procedure.
* Through this feature, editors can insert default navigation templates, infobox and categories,
* all in accord to our internal guidelines.
* 
* GitHub repository: https://github.com/brosquinha/ICP
*/
var SWWICP = (function($) {
    "use strict";
  
    var ICPversion = '3.1.0-beta.2';
    var ICP;
    var ModalInfobox;
    var StepWikitext;
  
    var StarWarsWiki = function() {
      ICP.call(this);
      
      this.version = ICPversion;
      this.infoboxName;
      this.infoboxUrl;
      this.outOfUniverse;
      this.articleType = '';
      this.infoboxObj = {};
      this.isCanonNamespace = false;
      this.infoboxesForTitle = ["Nave", "Filme", "Livro", "Livro de referência", "Quadrinhos", "Revista", "Série de quadrinhos", "Infobox TV", "Videogame"];
      this.anonMessage = true;
      this.sendFeedbackEnabled = true;
      this.closeFeedbackEnabled = true;
      this.wikitextAutoReset = true;
      this.replaceArticleWikitext = false;
      this.replaceFandomStandardLayout = true;
    };
  
    StarWarsWiki.prototype.getSteps = function() {
      return [
        this.articleTypeSelection,
        this.templateErasInsertion,
        this.infoboxInsertion,
        this.interwikiInsertion,
        this.categoriesInsertion
      ];
    };
  
    StarWarsWiki.prototype.shouldOpenICP = function() {
      this.isCanonNamespace = this.isMainNamespace();
      var isLegendsNamespace = mw.config.get("wgNamespaceNumber") == 114;
      return ((this.isNewArticle() && (isLegendsNamespace || this.isCanonNamespace)) || this.isSpecialCreatePage());
    };
  
    StarWarsWiki.prototype.setArticleTitle = function(articleTitle) {
      if (articleTitle.substr(0, 8) == "Legends:" && this.isSpecialCreatePage()) {
        this.articleTitle = articleTitle.substr(8);
        this.isCanonNamespace = false;
      } else {
        this.articleTitle = articleTitle;
        this.isCanonNamespace = true;
      }
    };
  
    StarWarsWiki.prototype.sendFeedback = function() {
      //This is meant for collecting info about how people use this tool so that I can improve it a lot more.
      //I am only sending people's hashID because I need to know whether the data is from different people or not.
      //This is also used to collect info when errors occur
      $.ajax({
        url:"https://www.99luca11.com/sww_helper",
        type: "POST",
        crossDomain: true,
        data: this.userActions,
        timeout: 7000,
        success: function(data) {
          console.log("Dados coletados: "+data);
        },
        error: function(data) {
          console.log("Envio malsucedido");
        }
      });
    };
  
    //Step0: article type selection
    StarWarsWiki.prototype.articleTypeSelection = function() {
      var dfd = $.Deferred();
      var instance = this;
      this.updateModalTitle("Criando um novo artigo");
      var articleTypes = [
        {name: "Personagem infobox", class: "personagem", label: "Personagem"},
        {name: "Planeta", class: "planeta", label: "Planeta"},
        {name: "Droide infobox", class: "droide", label: "Droide"},
        {name: "Nave", class: "nave", label: "Espaçonave"},
        {name: "Evento", class: "evento", label: "Evento"},
        {name: "Dispositivo infobox", class: "tecnologia", label: "Tecnologia"},
      ];
      this.insertArticleTypeTable(articleTypes, {numColumns: 2, hasOther: true}).then(this.errorHandler(function(type) {
        instance.articleType = type;
        console.log("Carregando modelo para "+type);
        instance.userActions.infoboxType = type;
        if (type == 'outro') {
          instance._otherInfoboxes().then(function() {
            dfd.resolve();
          });
        } else {
          instance.outOfUniverse = false; //false means it's an in-universe article
          instance.infoboxName = type;
          instance.infoboxUrl = instance.infoboxName;
          dfd.resolve();
        }
      }));
      return dfd.promise();
    };
  
    //Step0 helper: Select "Other"
    StarWarsWiki.prototype._otherInfoboxes = function() {
      var dfd = $.Deferred();
      var instance = this;
      var modalContent = "<p>Selecione uma infobox para seu artigo</p>"+
      '<select id="selecionarInfoboxCustom"><option value>Escolher infobox</option></select>';
      this.updateModalBody(modalContent);
      this.apiGetPageContents("Ajuda:Predefinições/Infobox").then(this.errorHandler(function(data) {
        var infoboxes = data.split("\n{{");
        for (var i=1; i<infoboxes.length; i++) {
          $("#selecionarInfoboxCustom").append('<option value="'+infoboxes[i].split("/preload")[0]+'">'+infoboxes[i].split("/preload")[0]+'</option>');
        }
        var chooseInfoboxTypeController = false;
        this.appendButtonToModalBody("Pronto").then(this.errorHandler(function(button) {
          instance.infoboxName = $("#selecionarInfoboxCustom").val();
          if (instance.infoboxName === '' || chooseInfoboxTypeController === true)
            return;
          chooseInfoboxTypeController = true;
          instance.userActions.infoboxType = instance.infoboxName;
          instance.infoboxUrl = instance.infoboxName;
          if (instance.infoboxName == "Batalha" || instance.infoboxName == "Guerra" || instance.infoboxName == "Missão")
          {
            //Batalha, Missão and Guerra infoboxes are special
            var numParticipants = '';
            while (numParticipants != '4' && numParticipants != '3' && numParticipants != '2')
              numParticipants = prompt("Quantos participantes? (2, 3 ou 4)");
            if (instance.infoboxName == "Batalha")
              instance.infoboxUrl = "Battle";
            else if (instance.infoboxName == "Guerra")
              instance.infoboxUrl = "War";
            else
              instance.infoboxUrl = "Mission";
            if (numParticipants == '2')
              instance.infoboxUrl += '300';
            else if (numParticipants == '3')
              instance.infoboxUrl += '350';
            else
              instance.infoboxUrl += '400';
          }
          console.log('Obtendo "'+instance.infoboxName+'"');
          var apiParams = {action: 'query', prop: 'categories', titles: 'Predefinição:'+instance.infoboxUrl, format: 'json'};
          this.apiGet(apiParams, function(data) {
            //Figuring out whether this is an in-universe or out-of-universe article based on infobox category
            instance.outOfUniverse = false; //false means it's an in-universe article
            try {
              var templateId = Object.keys(data.query.pages)[0];
              var categoryName = data.query.pages[templateId].categories[0].title;
              console.log(categoryName);
              if (typeof(categoryName) != "undefined")
                if (categoryName == "Categoria:Infoboxes de mídia")
                  instance.outOfUniverse = 1; //1 means out-of-universe article that needs Step1
                else if (categoryName == "Categoria:Infoboxes fora do universo")
                  instance.outOfUniverse = 2; //2 means out-of-universe article that does not need Step1
            } catch (e) {
              console.warn(e);
              //TODO send this to server for analysis
            }
            dfd.resolve();
          });
        }));
      }));
      return dfd.promise();
    };
  
    //Step1: Insert Eras template
    StarWarsWiki.prototype.templateErasInsertion = function() {
      var dfd = $.Deferred();
      var wikitext = new StepWikitext(this, 0);
      this.updateModalTitle("Passo 2: Universo");
      var modalContent, txtButtonYes, txtButtonNo;
      var instance = this;
      //Title template insertion
      if (this.infoboxesForTitle.indexOf(this.infoboxName) > -1)
        wikitext.append("{{Title|''"+this.articleTitle+"''}}\n");
      else
        wikitext.append("");
      if (this.outOfUniverse)
      {
        //Out-of-universe article, defining Eras questions properly
        if (this.outOfUniverse == 2)
        {
          //foraDeUniverso = 2 means we already know everything we need for Eras
          wikitext.append("{{Eras|real}}\n");
          this.userActions.passo1DT = 0;
          dfd.resolve();
        }
        else
        {
          modalContent = '<p style="font-size:14px">Esse é um artigo fora-de-universo sobre uma mídia. A que universo pertence sua história?</p>';
          this.updateModalBody(modalContent);
          var canonButton = '<img src="https://vignette.wikia.nocookie.net/pt.starwars/images/0/07/Eras-canon-transp.png" style="height:19px" alt="Cânon" />';
          var legendsButton = '<img src="https://vignette.wikia.nocookie.net/pt.starwars/images/8/8d/Eras-legends.png" style="height:19px" alt="Legends" />';
          var solveEras = this.errorHandler(function(response) {
            wikitext.append("{{Eras|"+(response == "none" ? "real" : response + "|real")+"}}\n");
            instance.userActions.erasAnswer = response;
            dfd.resolve();
          });
          this.appendButtonToModalBody(canonButton).then(function(button) {
            solveEras("canon");
          });
          this.appendButtonToModalBody(legendsButton).then(function(button) {
            solveEras("legends");
          });
          this.appendButtonToModalBody("Nenhum", {style: "vertical-align:top"}).then(function(button) {
            solveEras("none");
          });
        }
      }
      else
      {
        //In-universe article
        modalContent = '<img src="';
        modalContent += (this.isCanonNamespace) ? "https://vignette.wikia.nocookie.net/pt.starwars/images/8/8d/Eras-legends.png" : "https://vignette.wikia.nocookie.net/pt.starwars/images/0/07/Eras-canon-transp.png";
        modalContent += '" style="width:150px;float:right;" />';
        modalContent += '<p style="font-size:14px">Esse artigo existe no universo <span style="font-weight:bold">';
        if (this.isCanonNamespace)
        {
          modalContent += 'Cânon';
          txtButtonYes = 'Sim, também existe no <i>Legends</i>';
          txtButtonNo = 'Não, existe somente no Cânon';
          wikitext.append("{{Eras|canon");
        }
        else
        {
          modalContent += '<i>Legends</i>';
          txtButtonYes = 'Sim, também existe no Cânon';
          txtButtonNo = 'Não, existe somente no <i>Legends</i>';
          wikitext.append("{{Eras|legends");
        }
        modalContent += '</span>. Ele existe também no outro universo?</p>';
        this.updateModalBody(modalContent);
        this.appendButtonToModalBody(txtButtonYes).then(this.errorHandler(function(button) {
          wikitext.append((instance.isCanonNamespace) ? "|legends}}\n" : "|canon}}\n");
          instance.userActions.erasAnswer = true;
          dfd.resolve();
        }));
        this.appendButtonToModalBody(txtButtonNo).then(this.errorHandler(function(button) {
          wikitext.append("}}\n");
          instance.userActions.erasAnswer = false;
          dfd.resolve();
        }));
      }
      return dfd.promise();
    };
  
    //Step2: Filling in infobox
    StarWarsWiki.prototype.infoboxInsertion = function() {
      var dfd = $.Deferred();
      var instance = this;
      console.log("Obtendo infobox...");
      this.apiGetPageContents("Predefinição:"+this.infoboxUrl).then(this.errorHandler(function(data) {
        instance._infoboxParser(data, instance.infoboxName)
          .then(function() {
            dfd.resolve();
          })
          .fail(function(msg) {
            dfd.reject(msg);
          });
      }));
      return dfd.promise();
    };
  
    StarWarsWiki.prototype._infoboxParser = function(templateContent, templateName) {
      var dfd = $.Deferred();
      var wikitext = new StepWikitext(this, 1);
      var infoboxObj = {};
      var infoboxWikitext = '';
      var i;
      try {
        var infoboxContent = templateContent.split("</infobox>")[0] + "</infobox>";
        var infoboxDom = $.parseXML(infoboxContent);
      } catch (e) {
        dfd.reject(e.toString());
        return dfd.promise();
      }
  
      this.updateModalTitle("Passo 3: Infobox");
      var modalToolbox = '<p>Preencha a infobox para o artigo</p>'+
      '<p>Ferramentas:</p><div class="ICPbuttons"><div id="linkButton"></div><div id="refButton"></div></div>'+
      '<br /><button>Pronto</button></div>';
      var modalContent = new ModalInfobox(modalToolbox, this.articleTitle);
      modalContent.textareaValues.nome = '';
      modalContent.textareaValues.imagem = '';
      if (this.infoboxObj.name != templateName) this.infoboxObj = {parameters: {}};
  
      if (templateName == "Personagem infobox")
      {
        //Personagem infobox has a special "type" parameter
        var selectOptions = {
          id: "personagemTypes",
          callback: function() {
            var type = $(this).val();
            var infobox = modalContent.getInfoboxRoot();
            $(infobox).removeClass(function (index, className) {
              return (className.match(/(^|\s)pi-theme-\S+/g) || []).join(" ");
            });
            $(infobox).addClass("pi-theme-"+type.replace(/ /g, "-"));
          },
          options: []
        };
        var personagemTypes = templateContent.split("\n*");
        personagemTypes[personagemTypes.length-1] = personagemTypes[personagemTypes.length-1].split("\n")[0];
        for (i=1; i<personagemTypes.length; i++) {
          selectOptions.options.push({value: personagemTypes[i], label: personagemTypes[i]});
        }
        modalContent.addInfoboxFieldSelect("Tipo de personagem", "type", selectOptions);
      }
  
      for (i=0; i<$(infoboxDom).find("data").length; i++) {
        var dataTag, labelTagText, sourceText, opts;
        dataTag = $(infoboxDom).find("data")[i];
        sourceText = $(dataTag).attr('source');
        if (typeof $(dataTag).children()[0] === "undefined")
          labelTagText = sourceText;
        else
          labelTagText = $(dataTag).children()[0].innerHTML;
        if (sourceText in this.infoboxObj.parameters)
          opts = {value: this.infoboxObj.parameters[sourceText]};
        modalContent.addInfoboxField(labelTagText, sourceText, opts);
      }
      this.updateModalBody(modalContent.getContent());
  
      $("aside textarea").first().focus();
      $("aside textarea").first().blur();
      setTimeout(function () {$("aside textarea").first().focus(); }, 50); //Simple trick to force focus on the first textarea
      $("#CuratedContentToolModal section").css('overflow-y', 'auto');
      this._infoboxButtonsCallbacks();
  
      var instance = this;
      $("#CuratedContentToolModal section button").one("click", this.errorHandler(function() {
        infoboxObj = modalContent.getValues();
        infoboxObj.nome = instance.articleTitle;
        infoboxObj.imagem = '';
        instance.infoboxObj.name = templateName;
        instance.infoboxObj.parameters = infoboxObj;
        console.log(infoboxObj);
        infoboxWikitext = instance._buildInfoboxWikitext(templateName, infoboxObj);
        wikitext.append(infoboxWikitext);
        if (instance.outOfUniverse)
          wikitext.append("\n'''"+instance.articleTitle+"''' é um...");
        else
          wikitext.append("\n'''"+instance.articleTitle+"''' foi um...");
        dfd.resolve();
      }));
      return dfd.promise();
    };
  
    //Step2 helper: wikitext builder from infobox object
    StarWarsWiki.prototype._buildInfoboxWikitext = function(templateName, infoboxObj) {
      var wikitext = '{{' + templateName + "\n";
      for (var fieldName in infoboxObj) {
        wikitext += '|' + fieldName + ' = ' + infoboxObj[fieldName] + "\n";
      }
      wikitext += "}}";
      return wikitext;
    };
  
    //Step2 helper: buttons and callbacks
    StarWarsWiki.prototype._infoboxButtonsCallbacks = function() {
      window.isAlt = false;
      var instance = this;
      
      this._currentTextarea = {};
      $("aside textarea").focus(function() {
        instance._currentTextarea = this;
      });
      
      this.userActions.usageOfNewButtons = 0;
      var linkMarkupStart, linkMarkupEnd;
      if (this.isCanonNamespace) {
        linkMarkupStart = "[[";
        linkMarkupEnd = "]]";
      } else {
        linkMarkupStart = "{{"+"SUBST:L|";
        linkMarkupEnd = "}}";
      }

      $("#linkButton").click(function() {
        instance._insertTags(linkMarkupStart, linkMarkupEnd);
        instance.userActions.usageOfNewButtons += 1;
      });
      $("#refButton").click(function() {
        instance._insertTags('<ref name="NOME">', "</ref>");
        instance.userActions.usageOfNewButtons += 1;
      });
      $("#CuratedContentToolModal").keyup(function (e) {
        if(e.which == 18) window.isAlt = false;
      }).keydown(function (e) {
        if(e.which == 18) window.isAlt = true;
        if(e.which == 76 && window.isAlt == true) {
          instance._insertTags('{{'+'SUBST:L|', "}}");
          return false;
        }
      });
    };

    StarWarsWiki.prototype._insertTags = function(startTag, endTag) {
      var selectedElement = this._currentTextarea;
      var selectionStart = selectedElement.selectionStart;
      var selectionEnd = selectedElement.selectionEnd;

      var textBefore = selectedElement.value.substr(0, selectionStart);
      var textSelected = selectedElement.value.substr(selectionStart, (selectionEnd - selectionStart)) || "Exemplo";
      var textAfter = selectedElement.value.substr(selectionEnd);
      
      selectedElement.value = textBefore + startTag + textSelected + endTag + textAfter;

      var selectionIndex = (textBefore + startTag).length;
      selectedElement.focus();
      selectedElement.setSelectionRange(selectionIndex, (selectionIndex + textSelected.length));
    };
  
    //Step3: Insert interlang links
    StarWarsWiki.prototype.interwikiInsertion = function() {
      var dfd = $.Deferred();
      this.updateModalTitle("Passo 4: Fontes e Aparições");
      var modalContent = "<p>Por favor, insira o nome da página correspondente em inglês (nome da página na Wookieepedia):";
      modalContent += "<textarea id='wookieePage' name='wookieePage' >"
      +((this.articleType == "Personagem infobox" || this.articleType == "Planeta" || this.articleType == "Droide infobox") ? this.articleName.replace(/_/g, " ") : '')
      +"</textarea>";
      this.updateModalBody(modalContent);
      var instance = this;
      this.appendButtonToModalBody("Enviar", {callback: this.errorHandler(function(button) {
        var wookieePage = $("#wookieePage").val();
        if (wookieePage == '') return;
        if (instance.userActions.interlink === wookieePage) return dfd.resolve();
        $(button).attr('disabled', '');
        instance._getWookieeData(wookieePage)
        .then(function() {
            instance.userActions.interlink = wookieePage;
            dfd.resolve();
          })
          .fail(function() {
            $(button).removeAttr('disabled');
            //TODO testar várias tentativas de envio aqui
          });
      })});
      this.appendButtonToModalBody("Visualizar", {callback: this.errorHandler(function() {
        window.open("https://starwars.wikia.com/wiki/"+instance.encodeURL($("#wookieePage").val()));
      })});
      this.appendButtonToModalBody("Não sei / não existe").then(this.errorHandler(function() {
        var wikitext = new StepWikitext(instance, 2);
        instance.userActions.interlink = false;
        wikitext.append("\n\n== Notas e referências ==\n{{Reflist}}\n");
        dfd.resolve();
      }));
      return dfd.promise();
    };
  
    StarWarsWiki.prototype._getWookieeData = function(wookieePagename) {
      var dfd = $.Deferred();
      var instance = this;
      var success = this.errorHandler(function(data) {
        try {
          data = JSON.parse(data);
        } catch (e) {
          data = false;
        }
        instance._translateWookiee(data)
          .then(function() {
            dfd.resolve();
          })
          .fail(function() {
            dfd.reject();
          });
      });
      var error = function(jqXHR, textStatus, error) {
        alert("Erro ao obter página "+wookieePagename+" da Wookieepedia");
        console.warn(error);
        dfd.reject();
      };
      this.ajaxGet("https://www.99luca11.com/sww_helper?legacy=false&qm="+this.encodeURL(wookieePagename), success, error);
      // After migrating Wookiee and SWW to UCP, maybe we can replace this for https://www.mediawiki.org/wiki/Manual:CORS
      return dfd.promise();
    };
  
    //Gets and translates Wookiee's reference sections
    StarWarsWiki.prototype._translateWookiee = function (data) {
      var dfd = $.Deferred();
      var wikitext = new StepWikitext(this, 2);
      var wookieeWikitext = '';
      if (data === false) {
        alert("Página não encontrada!");
        dfd.reject();
        return dfd.promise();
      }
      var isRedirect = data.toLowerCase().substring(0, 9) == "#redirect";
      if (isRedirect) return this._redirectPage(data);
  
      var wookiee = this._buildWookieeData(data.replace("{{interlang", "{{Interlang"));
      wikitext.append("\n\n");
  
      wookiee.disclaimer = (wookiee.appearances || wookiee.bibliography || wookiee.cast || wookiee.sources) ? ["{{ICPDisclaimer}}", "|icp=1"] : ["", ''];
      
      var successionBoxSection;
      var successionBoxStartRegex = /\{\{Start(_| )box\}\}/;
      if (wookiee.appearances.search(successionBoxStartRegex) >= 0)
        successionBoxSection = "appearances";
      else if (wookiee.sources.search(successionBoxStartRegex) >= 0)
        successionBoxSection = "sources";
      else
        successionBoxSection = false;
      wookiee = this._translateSuccessionBox(wookiee, successionBoxSection);
  
      if (wookiee.cast !== '' && this.outOfUniverse == 1)
        wookieeWikitext += "== Elenco =="+wookiee.cast;
      if (wookiee.appearances !== '' && this.outOfUniverse === false)
        wookieeWikitext += "== Aparições =="+wookiee.appearances;
      if (wookiee.sources !== '')
        wookieeWikitext += "== Fontes =="+wookiee.sources;
      if (wookiee.bibliography !== '' && this.outOfUniverse)
        wookieeWikitext += "== Bibliografia =="+wookiee.bibliography;
      wookieeWikitext = wookieeWikitext.trimEnd();
      wookieeWikitext += "\n\n== Notas e referências ==\n{{Reflist}}\n\n";
      wookieeWikitext += this._addInterlang(wookiee);
  
      this.apiGetPageContents("Star Wars Wiki:Apêndice de Tradução de obras/JSON").then(this.errorHandler(function(data) {
        var fixes = JSON.parse(data.replace("<pre>", '').replace("</pre>", ''));
        for (var i=0; i<fixes.replacements.length; i++) {
          var txtRegEx = new RegExp(fixes.replacements[i][0], "g");
          wookieeWikitext = wookieeWikitext.replace(txtRegEx, fixes.replacements[i][1]);
        }
        wikitext.append(wookieeWikitext);
        dfd.resolve();
      }));
      return dfd.promise();
    };
  
    StarWarsWiki.prototype._buildWookieeData = function(wookieeText) {
      var wookiee = {
        page: wookieeText,
        appearances: '',
        sources: '',
        bibliography: '',
        cast: '',
        sections: wookieeText.split("==")
      };
      for (var i=0; i<wookiee.sections.length; i++) {
        if ($.trim(wookiee.sections[i]) == "Appearances") {
          wookiee.appearances = wookiee.sections[i+1]; //TODO Verficar por aparições não canônicas
        } else if ($.trim(wookiee.sections[i]) == "Bibliography") {
          wookiee.bibliography = wookiee.sections[i+1];
        } else if ($.trim(wookiee.sections[i]) == "Cast") {
          wookiee.cast = wookiee.sections[i+1];
        } else if ($.trim(wookiee.sections[i]) == "Sources") {
          wookiee.sources = wookiee.sections[i+1];
          if (wookiee.sources.search("{{Interlang") >= 0)
            wookiee.sources = wookiee.sources.split("{{Interlang")[0];
        }
      }
      return wookiee;
    };
  
    StarWarsWiki.prototype._translateSuccessionBox = function(wookiee, section) {
      if (section === false) {
        this.userActions.successionBox = false;
        return wookiee;
      }
      var translationRegexs = [
        [/\{\{Start(_| )box\}\}/g, '{{Traduzir}}{{Caixa inicio}}'],
        [/\{\{Succession(_| )box\s*\|/g, '{{Caixa de sucessão\n|'],
        [/\|\s*title\s*\=\s*/g, '|titulo = '],
        [/\|\s*years\s*\=\s*/g, '|anos = '],
        [/\|\s*before\s*\=\s*/g, '|antes = '],
        [/\|\s*before\-years\s*\=\s*/g, '|antes-anos = '],
        [/\|\s*after\s*\=\s*/g, '|depois = '],
        [/\|\s*after\-years\s*\=\s*/g, '|depois-anos = '],
        [/\{\{End(_| )box\}\}/g, '{{Caixa fim}}'],
        [/\[\[(\d+) ABY(\]\]|\|)/g, '[[$1 DBY$2'],
        [/\[\[(\d+) BBY(\]\]|\|)/g, '[[$1 ABY$2'],
      ];
      translationRegexs.forEach(function(regex) {
        wookiee[section] = wookiee[section].replace(regex[0], regex[1]);
      });
      this.userActions.successionBox = true;
      return wookiee;
    };
  
    StarWarsWiki.prototype._addInterlang = function(wookiee) {
      if (wookiee.page.search("{{Interlang") >= 0) {
        //Adding HotCat data
        var hotcatInterlinks = wookiee.page.split("{{Interlang")[1].split("}}")[0].split("|");
        for (var i=0; i<hotcatInterlinks.length; i++)
          hotcatInterlinks[i] = hotcatInterlinks[i].replace("=", ":").replace(/\n/g, ''); //Yep, only the first "="
        this.userActions.hotCatData = 'pt:'+encodeURIComponent(this.articleName+hotcatInterlinks.join("|"));
        return (wookiee.disclaimer[0]+"{{Interlang\n|en="+$("#wookieePage").val()+
          wookiee.page.split("{{Interlang")[1].split("}}")[0]+wookiee.disclaimer[1]+"}}"); //Tratar erro
      } else {
        this.userActions.hotCatData = 'pt:'+encodeURIComponent(this.articleName);
        return wookiee.disclaimer[0]+"{{Interlang\n|en="+$("#wookieePage").val()+"\n"+wookiee.disclaimer[1]+"\n}}";
      }
    };
  
    //Step3 helper: wookiee page validator
    StarWarsWiki.prototype._redirectPage = function(data) {
      $("#wookieePage").val(data.split("[[")[1].split("]]")[0]);
      return this._getWookieeData($("#wookieePage").val());
    };
  
    //Step4: Categorize
    StarWarsWiki.prototype.categoriesInsertion = function() {
      var dfd = $.Deferred();
      var instance = this;
      this.updateModalTitle("Passo 5: Categorias");
      var modalContent = '<p>Para finalizar, categorize o artigo. Lembre-se de não ser reduntante: se categorizar '+
      'o artigo como "Mestre Jedi", por exemplo, <b>NÃO</b> o categorize como "Jedi".</p>';
      this.userActions.categorias = true;
      if (this.VESurface.mode == "visual") {
        //For VE, we'll simply redirect user to VE's categories interface
        modalContent += '<p>Para isso, escreva as categorias na caixa "Adicionar uma categoria". '+
        'Quando terminar, clique no botão "Aplicar".</p>';
        this.updateModalBody(modalContent);
        this.appendButtonToModalBody("Ok, vamos lá").then(function(button) {
          instance._finish = function() {
            ICP.prototype._finish.call(instance);
            instance.VESurface.executeCommand("meta/categories");
            // For some reason, if the user clicks on "Cancel" on VE's categories modal,
            // the inserted articleWikitext is removed. As such, this little hack will
            // invoke this VE modal only after articleWikitext is successfully inserted
          }
          dfd.resolve();
        });
      } else {
        // Since VE's sorce mode does not have meta/categories enabled, let's just explain
        // how to add categories using plain wikitext
        modalContent += '<p>Para isso, escreva nos final do artigo as categorias da seguinte forma:</p>'+
        '<p><code>[['+'Categoria:Exemplo]]</code></p>';
        this.updateModalBody(modalContent);
        this.appendButtonToModalBody("Ok, vamos lá").then(function(button) {
          dfd.resolve();
        });
      }
      return dfd.promise();
    };

    // importArticles({
    //   type: 'script',
    //   article: 'u:dev:MediaWiki:ICP.js'
    // });
    
    mw.hook("dev.icp").add(function(icpModule) {
      ICP = icpModule.ICP;
      StepWikitext = icpModule.StepWikitext;
      ModalInfobox = icpModule.ModalInfobox;
      icpModule.extend(StarWarsWiki);
  
      var sww = new StarWarsWiki();
      sww.errorHandler(sww.init);
      sww.init.__errorHandler__();
    });
    
    return {
      ICP: ICP,
      StarWarsWiki: StarWarsWiki,
      isAlt: false //Key control
    };
})(jQuery);
