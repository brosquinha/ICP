/* ************************************************************************
************************* Page Creation Interface *************************
* Page Creation Interface (ICP) is a helping tool developed by Thales César for creating new articles in Star Wars Wiki em Português. It consists on a modal window that simplifies the article-creation process into a step-by-step procedure. Through this feature, editors can insert default navigation templates, infobox and categories, all in acord to our internal guidelines. NOTE: I have discussed this tool with FANDOM Staff, and I've got their approval.
* GitHub repository: https://github.com/brosquinha/ICP
*/

var SWWICP = (function($) {
  "use strict";
  var ICPversion = '2.8.0-beta.1';
  var articleName, articleTitle;
  var infoboxName, infoboxUrl;
  var articleWikitext = '';
  var articleType = '';
  var ICP_wys = false;
  var deltaTime;
  var userActions = {};
  var outOfUniverse;
  var isCanonNamespace;
  var infoboxesForTitle = ["Nave", "Filme", "Livro", "Livro de referência", "Quadrinhos", "Revista", "Série de quadrinhos", "Infobox TV", "Videogame"];
  var wikiBaseURL = window.location.origin + mw.config.get("wgArticlePath").replace("$1", "");

  //In case there's an unexpected error, send details to server for analysis
  var errorHandler = function(funcao) {
    try {
      funcao();
    }
    catch(e) {
      console.error(e.toString());
      var erroTxt = e.name + ": " + e.message
      erroTxt += (typeof e.stack === "undefined") ? '' : ' - ' + e.stack;
      userActions.errors.push(erroTxt);
      userActions.userAgent = window.navigator.userAgent;
      alert("Ocorreu um erro. Um relatório sobre esse inconveniente está sendo enviado para os administradores. Sua edição até aqui será salva.");
      finishEdit();
    }
  }

  var treatError = function(msg) {
    console.warn(msg);
    userActions.errors.push(msg);
    userActions.userAgent = window.navigator.userAgent;
    alert("Ocorreu um erro. Um relatório sobre esse inconveniente está sendo enviado para os administradores. Sua edição até aqui será salva.");
    finishEdit();
  }

  /**
   * Peforms a GET request on given URL
   *
   * @param {String} url URL to be called
   * @param {Function} successCallback Success callback
   * @param {Function} [errorCallback] Error callback
   */
  var ajaxGet = function(url, successCallback, errorCallback=false) {
    showLoader();
    $.ajax({
      method: "GET",
      url: url,
      success: function(data) {
        hideLoader();
        errorHandler(function() { successCallback(data); });
      },
      error: errorCallback || retryAjax
    });
  }

  var retryAjax = function(xhr, textStatus, error) {
    hideLoader();
    if (xhr.status >= 400 && xhr.status < 500) {
      treatError(xhr.toString());
    } else {
      alert("Erro ao carregar informações da wiki. Tentando novamente em 30 segundos...");
      var ajaxSettings = this;
      console.log(this);
      setTimeout(function() {
        showLoader();
        $.ajax(ajaxSettings);
      }, 30000);
    }
  }

  //Controller
  var controller = function() {
    buildModal();
    $.when(confirmAnon())
      .then(articleTypeSelection)
      .then(templateErasInsertion)
      .then(infoboxInsertion)
      .then(interwikiInsertion)
      .then(categoriesInsertion)
      .then(finishEdit)
      .fail(treatError)
  }

  //Helpers
  /**
   * Builds ICP's modal
   */
  var buildModal = function() {
    if (document.getElementById("blackout_CuratedContentToolModal") != "null")
      $("#blackout_CuratedContentToolModal").remove();
    $(document.head).append('<link rel="stylesheet" href="https://slot1-images.wikia.nocookie.net/__am/7900017900012/sass/background-dynamic%3Dtrue%26background-image%3Dhttps%253A%252F%252Fvignette.wikia.nocookie.net%252Fpt.starwars%252Fimages%252F5%252F50%252FWiki-background%252Frevision%252Flatest%253Fcb%253D20180407180604%26background-image-height%3D820%26background-image-width%3D1920%26color-body%3D%2523ddedfd%26color-body-middle%3D%2523ddedfd%26color-buttons%3D%25232f8f9d%26color-community-header%3D%25232f8f9d%26color-header%3D%25232f8f9d%26color-links%3D%2523006cb0%26color-page%3D%2523ffffff%26oasisTypography%3D1%26page-opacity%3D100%26widthType%3D0/resources/wikia/ui_components/modal/css/modal_default.scss" />');
    $('body').append('<div id="blackout_CuratedContentToolModal" class="modal-blackout visible" style="z-index:"5000105>'
      +'<div id="CuratedContentToolModal" class="modal medium no-scroll curated-content-tool-modal ">'
        +'<header>'
          +'<span class="close">Close</span>'
            +'<img alt="Carregando" src="https://slot1-images.wikia.nocookie.net/__cb1591343180920/common/skins/common/images/ajax.gif" style="vertical-align: baseline; display: none; border: 0px;" />'
            +'<h3 style="display: inline;"></h3>'
        +'</header>'
        +'<section></section>'
        +'<footer>'
          +'<button id="configuracoesICP" class="secondary">Configurações</button>'
        +'</footer>'
      +'</div>'
    +'</div>');
    setModalButtonsCallbacks();
  }

  var setModalButtonsCallbacks = function() {
    $("#CuratedContentToolModal span.close").click(function() {
      //Many people seem to leave in the middle of the process, so let's ask them why
      if (typeof(userActions.passo0DT) != "undefined" && typeof(userActions.passo4DT) == "undefined" && typeof(userActions.errors[0]) == 'undefined')
        userActions.closeFeedback = prompt("Por favor, nos ajude a deixar essa ferramenta ainda melhor. Diga-nos o motivo de estar abandonando o processo no meio.") || false;
      $("#blackout_CuratedContentToolModal").removeClass('visible');
      sendFeedback();
    });
    $("#configuracoesICP").click(function () {
      //Config modal
      var configModal = "<form name='config_form'><p><label>Abrir Interface de Criação de Páginas sempre que iniciar nova página."+
      "<input type='checkbox' name='default_action' checked /></label></p></form>"+
      '<p><a href="https://starwars.fandom.com/pt/wiki/Utilizador:Thales_C%C3%A9sar/ICP" target="_blank">Sobre a ICP</a> - versão '+ICPversion+'</p>';
      $.showCustomModal('Configurações', configModal, {
        id: 'ModalSettingsWindow',
        width: 600,
        height: 250,
        buttons: [{
          message: 'Enviar feedback',
          handler: function() {
            var feedbackTxt = prompt("Envie um comentário sobre essa ferramenta para os administradores: ");
            if (feedbackTxt)
            {
              userActions.msgFeedback = feedbackTxt
              sendFeedback();
              alert("Obrigado!");
            }
          }
        },{
          message: 'Resetar mudanças',
          handler: function() {
            $('#ModalSettingsWindow fieldset').replaceWith(configModal);
          }
        },{
          message: 'Salvar',
          handler: function() {
            var formRes = $('form[name="config_form"]').serialize();
            var settingsObj = {}
            if (formRes.search("default_action") > -1)
              settingsObj.default_action = 1;
            else
              settingsObj.default_action = 0;
            localStorage.ICPsettings = JSON.stringify(settingsObj);
            alert("Alterações salvas!");
          }
        }]
      });
    });
    $("#finalizarEdicao").click(function () {
      finishEdit();
    });
  }

  /**
   * Updates modal's content
   *
   * @param {String} content HTML content
   */
  var updateModalBody = function(content) {
    $("#CuratedContentToolModal section").html(content);
  }

  /**
   * Updates modal's title
   *
   * @param {String} title Modal's title
   */
  var updateModalTitle = function(title) {
    $("#CuratedContentToolModal header h3").text(title);
  }

  /**
   * Appends a button to modal's body
   *
   * @param {String} label Button label
   * @param {Object} [options] Button configuration
   * @param {Boolean} [options.secondary] Whether button is secondary
   * @param {String} [options.style] Button custom CSS style
   * @param {Function} [options.callback] Callback for every button click event
   * @returns {Promise} Callback for first user click
   */
  var appendButtonToModalBody = function(label, options={}) {
    var dfd = $.Deferred();
    var button = document.createElement("button");
    button.innerHTML = label;
    button.className = (options.secondary) ? "secondary" : "";
    button.style = options.style || "";
    $(button).click(function() {
      if (options.callback)
        options.callback(button);
      dfd.resolve(this);
    });
    $("#CuratedContentToolModal section").append(button);
    return dfd.promise();
  }

  /**
   * Resizes modal's window
   *
   * @param {String} size CSS width
   */
  var resizeModal = function(size="") {
    $("#CuratedContentToolModal").css('width', size);
  }

  /**
   * Shows modal's AJAX loader gif
   */
  var showLoader = function() {
    $("#CuratedContentToolModal header img").show();
  }

  /**
   * Hides modal's AJAX loader gif
   */
  var hideLoader = function() {
    $("#CuratedContentToolModal header img").hide();
  }

  /**
   * Inserts an article type selection table into modal
   *
   * @param {Object[]} articleTypes List of articleTypes
   * @param {string} articleTypes[].name Template name
   * @param {string} articleTypes[].class CSS class name
   * @param {string} articleTypes[].label Type label
   * @param {Object} options Display options
   * @param {Number} options.numColumns Number of columns to display data
   * @param {Boolean} options.hasOther Whether to display "Other infoboxes" option
   * @returns {Promise} Callback for user selection
   */
  var insertArticleTypeTable = function(articleTypes, options = {}) {
    var dfd = $.Deferred();
    var rootDiv = document.createElement("div");
    var introParagraph = document.createElement("p");
    introParagraph.style.marginTop = "0";
    introParagraph.id = "NovaPaginaIntroParagraph";
    introParagraph.textContent = "Selecione um tipo de artigo:";
    rootDiv.appendChild(introParagraph);

    var flexBasisFromOptions = {1: "100%", 2: "50%", 3: "33%", 4: "25%", 5: "20%", 6: "12%"};
    var parentDiv = document.createElement("div");
    parentDiv.style.display = "flex";
    parentDiv.style.justifyContent = "space-around";
    parentDiv.style.textAlign = "center";
    parentDiv.style.flexWrap = "wrap";
    parentDiv.id = "NovaPaginaTipoDeArtigo";
    articleTypes.forEach(function(type) {
      var typeElem = document.createElement("div");
      typeElem.style.flexGrow = "1";
      typeElem.style.flexBasis = flexBasisFromOptions[options.numColumns] || "auto";
      typeElem.setAttribute("data-tipo", type.name);
      typeElem.innerHTML = '<div class="infoboxIcon '+type.class+'"></div>'+type.label;
      parentDiv.appendChild(typeElem);
    });
    if (options.hasOther) {
      var typeElem = document.createElement("div");
      typeElem.style.flexGrow = "1";
      typeElem.style.flexBasis = "100%";
      typeElem.setAttribute("data-tipo", "outro");
      typeElem.textContent = "Outro tipo de artigo";
      parentDiv.appendChild(typeElem);
    }
    rootDiv.appendChild(parentDiv);
    updateModalBody(rootDiv.innerHTML);

    $("#NovaPaginaTipoDeArtigo>div").one("click", function() {
      dfd.resolve($(this).attr("data-tipo"));
    });
    return dfd.promise();
  }

  //Pre-Step0: Confirm anons intention on creating an article
  var confirmAnon = function() {
    var dfd = $.Deferred();
    if (userActions.user === false && document.location.href.search("redlink=1") >= 0)
    {
      //Many anons get here accidentally, so let's confirm they really intend to create a new article
      var modalContent = '<p>Você seguiu para uma página que não existe. Para criá-la, clique em "Continuar". '+
      'Para voltar a navegar na <i>Star Wars Wiki</i> em Português, clique em "Voltar".</p>';
      $("#configuracoesICP").hide();
      resizeModal("500px");
      updateModalBody(modalContent);
      updateModalTitle("Criando um novo artigo");
      appendButtonToModalBody("Voltar", {secondary: true}).then(function(button) {
        window.history.back();
      });
      appendButtonToModalBody("Continuar", {style: "float: right;"}).then(function(button) {
        resizeModal();
        $("#configuracoesICP").show();
        dfd.resolve();
      });
    } else
      dfd.resolve();
    return dfd.promise();
    //TODO write Selenium test for this
  }

  //Step0: article type selection
  var articleTypeSelection = function() {
    var dfd = $.Deferred();
    updateModalTitle("Criando um novo artigo");
    var articleTypes = [
      {name: "Personagem infobox", class: "personagem", label: "Personagem"},
      {name: "Planeta", class: "planeta", label: "Planeta"},
      {name: "Droide infobox", class: "droide", label: "Droide"},
      {name: "Nave", class: "nave", label: "Espaçonave"},
      {name: "Evento", class: "evento", label: "Evento"},
      {name: "Dispositivo infobox", class: "tecnologia", label: "Tecnologia"},
    ];
    insertArticleTypeTable(articleTypes, {numColumns: 2, hasOther: true}).then(function(articleType) {
      console.log("Carregando modelo para "+articleType);
      deltaTime = (new Date().getTime()) - deltaTime;
      userActions.passo0DT = deltaTime;
      userActions.infoboxType = articleType;
      if (articleType == 'outro')
      {
        $.when(otherInfoboxes()).then(function() {
          dfd.resolve();
        })
      }
      else
      {
        outOfUniverse = false; //false means it's an in-universe article
        infoboxName = articleType;
        infoboxUrl = encodarURL(infoboxName);
        dfd.resolve();
      }
    });
    deltaTime = new Date().getTime();
    return dfd.promise();
  }

  //Step0 helper: Select "Other"
  var otherInfoboxes = function() {
    var dfd = $.Deferred();
    var modalContent = "<p>Selecione uma infobox para seu artigo</p>"+
    '<select id="selecionarInfoboxCustom"><option value>Escolher infobox</option></select>';
    updateModalBody(modalContent);
    ajaxGet(wikiBaseURL+"Ajuda:Predefini%C3%A7%C3%B5es/Infobox?action=raw", function(data) {
      var infoboxes = data.split("\n{{")
      for (var i=1; i<infoboxes.length; i++)
      {
        $("#selecionarInfoboxCustom").append('<option value="'+infoboxes[i].split("/preload")[0]+'">'+infoboxes[i].split("/preload")[0]+'</option>');
      }
      var chooseInfoboxTypeController = false;
      appendButtonToModalBody("Pronto").then(function(button) { errorHandler(function() {
        infoboxName = $("#selecionarInfoboxCustom").val();
        if (infoboxName == '' || chooseInfoboxTypeController ==  true)
          return;
        chooseInfoboxTypeController = true;
        userActions.infoboxType = infoboxName;
        infoboxUrl = encodarURL(infoboxName);
        if (infoboxName == "Batalha" || infoboxName == "Guerra" || infoboxName == "Missão")
        {
          //Batalha, Missão and Guerra infoboxes are special
          var numParticipants = '';
          while (numParticipants != '4' && numParticipants != '3' && numParticipants != '2')
            numParticipants = prompt("Quantos participantes? (2, 3 ou 4)")
          if (infoboxName == "Batalha")
            infoboxUrl = "Battle";
          else if (infoboxName == "Guerra")
            infoboxUrl = "War";
          else
            infoboxUrl = "Mission";
          if (numParticipants == '2')
            infoboxUrl += '300';
          else if (numParticipants == '3')
            infoboxUrl += '350';
          else
            infoboxUrl += '400';
        }
        console.log('Obtendo "'+infoboxName+'"');
        ajaxGet("https://starwars.fandom.com/pt/api.php?action=query&prop=categories&titles=Predefinição:"+infoboxUrl+"&format=xml", function(data) {
          //Figuring out whether this is an in-universe or out-of-universe article based on infobox category
          var categoryName = $($(data).find("cl")[0]).attr('title');
          console.log(categoryName);
          outOfUniverse = false; //false means it's an in-universe article
          if (typeof(categoryName) != "undefined")
            if (categoryName == "Categoria:Infoboxes de mídia")
              outOfUniverse = 1; //1 means out-of-universe article that needs Step1
            if (categoryName == "Categoria:Infoboxes fora do universo")
              outOfUniverse = 2; //2 means out-of-universe article that does not need Step1
          dfd.resolve();
        });
      })});
    });
    return dfd.promise();
  }

  //Step1: Insert Eras template
  var templateErasInsertion = function()
  {
    var dfd = $.Deferred();
    updateModalTitle("Passo 1: Universo");
    var modalContent, txtButtonYes, txtButtonNo;
    userActions.editor = (window.wgAction == 'edit') ? "source" : "VE";
    if (window.wgAction == 'edit' && $("#cke_21_label").length == 1)
    {
      window.CKEDITOR.tools.callFunction(56); //For WYSIWYG editor
      ICP_wys = true;
      userActions.editor = "WYSIWYG";
    }
    //Title template insertion
    if (infoboxesForTitle.indexOf(infoboxName) > -1)
      articleWikitext = "{{Title|''"+articleTitle+"''}}\n";
    else
      articleWikitext = "";
    if (outOfUniverse)
    {
      //Out-of-universe article, defining Eras questions properly
      if (outOfUniverse == 2)
      {
        //foraDeUniverso = 2 means we already know everything we need for Eras
        articleWikitext += "{{Eras|real}}\n";
        userActions.passo1DT = 0;
        dfd.resolve();
      }
      else
      {
        modalContent = '<p style="font-size:14px">Esse é um artigo fora-de-universo sobre uma mídia. A que universo pertence sua história?</p>';
        updateModalBody(modalContent);
        deltaTime = new Date().getTime();
        var canonButton = '<img src="https://vignette.wikia.nocookie.net/pt.starwars/images/0/07/Eras-canon-transp.png" style="height:19px" alt="Cânon" />';
        var legendsButton = '<img src="https://vignette.wikia.nocookie.net/pt.starwars/images/8/8d/Eras-legends.png" style="height:19px" alt="Legends" />';
        var solveEras = function(response) {
          articleWikitext += "{{Eras|"+(response == "none" ? "real" : response + "|real")+"}}\n";
          userActions.passo1DT = (new Date().getTime() - deltaTime);
          userActions.erasAnswer = response;
          dfd.resolve();
        }
        appendButtonToModalBody(canonButton).then(function(button) {
          solveEras("canon");
        });
        appendButtonToModalBody(legendsButton).then(function(button) {
          solveEras("legends");
        })
        appendButtonToModalBody("Nenhum", {style: "vertical-align:top"}).then(function(button) {
          solveEras("none");
        });
      }
    }
    else
    {
      //In-universe article
      modalContent = '<img src="';
      modalContent += (isCanonNamespace) ? "https://vignette.wikia.nocookie.net/pt.starwars/images/8/8d/Eras-legends.png" : "https://vignette.wikia.nocookie.net/pt.starwars/images/0/07/Eras-canon-transp.png";
      modalContent += '" style="width:150px;float:right;" />';
      modalContent += '<p style="font-size:14px">Esse artigo existe no universo <span style="font-weight:bold">';
      if (isCanonNamespace)
      {
        modalContent += 'Cânon';
        txtButtonYes = 'Sim, também existe no <i>Legends</i>';
        txtButtonNo = 'Não, existe somente no Cânon';
        articleWikitext += "{{Eras|canon";
      }
      else
      {
        modalContent += '<i>Legends</i>';
        txtButtonYes = 'Sim, também existe no Cânon';
        txtButtonNo = 'Não, existe somente no <i>Legends</i>';
        articleWikitext += "{{Eras|legends";
      }
      modalContent += '</span>. Ele existe também no outro universo?</p>';
      updateModalBody(modalContent);
      deltaTime = new Date().getTime();
      appendButtonToModalBody(txtButtonYes).then(function(button) {
        articleWikitext += (isCanonNamespace) ? "|legends}}\n" : "|canon}}\n";
        userActions.passo1DT = (new Date().getTime() - deltaTime);
        userActions.erasAnswer = true;
        dfd.resolve();
      });
      appendButtonToModalBody(txtButtonNo).then(function(button) {
        articleWikitext += "}}\n";
        userActions.passo1DT = (new Date().getTime() - deltaTime);
        userActions.erasAnswer = false;
        dfd.resolve();
      });
    }
    return dfd.promise();
  }

  //Step2: Filling in infobox
  var infoboxInsertion = function() {
    var dfd = $.Deferred();
    console.log("Obtendo infobox...");
    ajaxGet(wikiBaseURL+"Predefini%C3%A7%C3%A3o:"+infoboxUrl+"?action=raw", function(data) {
      $.when(infoboxParser(data, infoboxName))
        .then(function() {
          dfd.resolve();
        })
        .fail(function(msg) {
          dfd.reject(msg);
        });
    });
    return dfd.promise();
  }

  var infoboxParser = function (templateContent, templateName)
  {
    var dfd = $.Deferred();
    try {
      var infoboxContent = templateContent.split("</infobox>")[0] + "</infobox>"; //Tratar erro
      var infoboxObj = $.parseXML(infoboxContent); //Tratar erro
    } catch (e) {
      dfd.reject(e.toString());
      return dfd.promise();
    }
    updateModalTitle("Passo 2: Infobox");
    var titleTagParam = $($(infoboxObj).find("title")[0]).attr('source');
    var modalContent = '<div style="position:relative"><div style="position:fixed;"><p>Preencha a infobox para o artigo</p>'+
    '<p>Ferramentas:</p><div class="ICPbuttons"><div id="linkButton"></div><div id="refButton"></div></div>'+
    '<br /><button>Pronto</button></div>';
    modalContent += '<aside class="portable-infobox pi-background pi-theme-Media pi-layout-default">'+
    '<h2 class="pi-item pi-item-spacing pi-title">'+articleTitle+'</h2>';
    articleWikitext += "{{"+templateName+"\n";
    articleWikitext += "|nome-"+articleTitle+"\n";
    articleWikitext += "|imagem-\n";
    if (templateName == "Personagem infobox")
    {
      //Personagem infobox has a special "type" parameter
      var personagemTypes = templateContent.split("\n*");
      personagemTypes[personagemTypes.length-1] = personagemTypes[personagemTypes.length-1].split("\n")[0];
      modalContent += '<div class="pi-item pi-data pi-item-spacing pi-border-color">'+
      '<h3 class="pi-data-label pi-secondary-font">Tipo de personagem</h3>'+
      '<div class="pi-data-value pi-font"><select id="personagemTypes">';
      for (var i=1; i<personagemTypes.length; i++)
      {
        modalContent += '<option value="'+personagemTypes[i]+'">'+personagemTypes[i]+'</option>';
      }
      modalContent += "</select></div></div>";
      articleWikitext += "|type-\n";
    }
    for (var i=0; i<$(infoboxObj).find("data").length; i++)
    {
      var dataTag, labelTagText;
      dataTag = $(infoboxObj).find("data")[i];
      if (typeof $(dataTag).children()[0] === "undefined")
        labelTagText = $(dataTag).attr('source');
      else
        labelTagText = $(dataTag).children()[0].innerHTML;
      modalContent += '<div class="pi-item pi-data pi-item-spacing pi-border-color">'+
      '<h3 class="pi-data-label pi-secondary-font">'+labelTagText+'</h3>'+
      '<div class="pi-data-value pi-font"><textarea placeholder="Preencher"></textarea></div></div>';
      articleWikitext += "|"+($(dataTag).attr('source'))+"=\n";
    }
    articleWikitext += "}}\n";
    modalContent += '</aside>';
    updateModalBody(modalContent);
    $("aside textarea").first().focus();
    $("aside textarea").first().blur();
    setTimeout(function () {$("aside textarea").first().focus(); }, 50); //Simple trick to force focus on the first textarea
    deltaTime = new Date().getTime();
    $("#CuratedContentToolModal section").css('overflow-y', 'auto');
    infoboxButtonsCallbacks();
    $("#CuratedContentToolModal section button").one("click", function() { errorHandler(function() {
      userActions.passo2DT = (new Date().getTime()) - deltaTime;
      var infoboxTextareas = $("#CuratedContentToolModal section aside textarea");
      var subArtTxt = articleWikitext.split("=");
      articleWikitext = subArtTxt[0].replace("|nome-", "|"+titleTagParam+" = ").replace("|imagem-", "|imagem = ").replace("|type-", "|type = "+$("#personagemTypes").val());
      for (var i=0; i<infoboxTextareas.length; i++)
      {
        articleWikitext += ' = '+$(infoboxTextareas[i]).val();
        articleWikitext += subArtTxt[i+1];
      }
      if (outOfUniverse)
        articleWikitext += "'''"+articleTitle+"''' é um...";
      else
        articleWikitext += "'''"+articleTitle+"''' foi um...";
      console.log(articleWikitext);
      dfd.resolve();
    })});
    return dfd.promise();
  }

  //Step2 helper: buttons and callbacks
  var infoboxButtonsCallbacks = function() {
    userActions.usageOfNewButtons = 0;
    if (typeof mw.toolbar === "undefined") //For VE
      importScriptURI("https://slot1-images.wikia.nocookie.net/__load/-/debug%3Dfalse%26lang%3Dpt-br%26skin%3Doasis%26version%3D1508417393-20171019T123000Z/jquery.textSelection%7Cmediawiki.action.edit");
    if (isCanonNamespace)
    {
      $("#linkButton").click(function() {
        mw.toolbar.insertTags("[[", "]]", "Exemplo", 0);
        userActions.usageOfNewButtons += 1;
      });
    }
    else
    {
      $("#linkButton").click(function() {
        mw.toolbar.insertTags("{{"+"SUBST:L|", "}}", "Exemplo", 0);
        userActions.usageOfNewButtons += 1;
      });
    }
    $("#refButton").click(function() {
      mw.toolbar.insertTags('<ref name="NOME">', "</ref>", "Exemplo", 0);
      userActions.usageOfNewButtons += 1;
    });
    $("img.mw-toolbar-editbutton[title='Legends link']").attr('accesskey', '');
    $("#CuratedContentToolModal").keyup(function (e) {
      if(e.which == 18) SWWICP.isAlt = false;
    }).keydown(function (e) {
      if(e.which == 18) SWWICP.isAlt = true;
      if(e.which == 76 && SWWICP.isAlt == true) {
        mw.toolbar.insertTags('{{'+'SUBST:L|', "}}", "Exemplo", 0);
        return false;
      }
    });
    $("#personagemTypes").change(function() {
      var type = $(this).val();
      $("#CuratedContentToolModal aside").removeClass(function (index, className) {
        return (className.match(/(^|\s)pi-theme-\S+/g) || []).join(" ");
      });
      $("#CuratedContentToolModal aside").addClass("pi-theme-"+type.replace(/ /g, "-"));
    });
  }

  //Step3: Insert interlang links
  var interwikiInsertion = function ()
  {
    var dfd = $.Deferred();
    updateModalTitle("Passo 3: Fontes e Aparições");
    var modalContent = "<p>Por favor, insira o nome da página correspondente em inglês (nome da página na Wookieepedia):";
    modalContent += "<textarea id='wookieePage' name='wookieePage' >"
    +((articleType == "Personagem infobox" || articleType == "Planeta" || articleType == "Droide infobox") ? articleName.replace(/_/g, " ") : '')
    +"</textarea>";
    updateModalBody(modalContent);
    deltaTime = new Date().getTime();
    appendButtonToModalBody("Enviar", {callback: function(button) {
      if ($("#wookieePage").val() == '')
        return;
      $(button).attr('disabled', '');
      userActions.passo3DT = (new Date().getTime()) - deltaTime;
      userActions.interlink = $("#wookieePage").val();
      getWookieeData($("#wookieePage").val())
        .then(function() {
          dfd.resolve();
        })
        .fail(function() {
          $(button).removeAttr('disabled');
          //TODO testar várias tentativas de envio aqui
        });
    }});
    appendButtonToModalBody("Visualizar", {callback: function() {
      window.open("https://starwars.wikia.com/wiki/"+encodarURL($("#wookieePage").val()))
    }});
    appendButtonToModalBody("Não sei / não existe").then(function() {
      userActions.interlink = false;
      userActions.passo3DT = (new Date().getTime()) - deltaTime;
      dfd.resolve(false);
    });
    return dfd.promise();
  }

  var getWookieeData = function(wookieePagename) {
    var dfd = $.Deferred();
    var success = function(data) {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = false;
      }
      $.when(translateWookiee(data))
        .then(function() {
          dfd.resolve();
        })
        .fail(function() {
          dfd.fail();
        });
    };
    var error = function(jqXHR, textStatus, error) {
      alert("Erro ao obter página "+wookieePagename+" da Wookieepedia");
      console.warn(error);
      dfd.fail();
    }
    ajaxGet("https://www.99luca11.com/sww_helper?legacy=false&qm="+encodarURL(wookieePagename), success, error);
    return dfd.promise();
  }

  //Gets and translates Wookiee's reference sections
  var translateWookiee = function (data)
  {
    var dfd = $.Deferred();
    if (data === false)
    {
      alert("Página não encontrada!");
      $("#CuratedContentToolModal section button").removeAttr('disabled');
      dfd.reject();
      return dfd.promise();
    }
    if (redirectPageIfWookieeIsRedirect(data)) {
      dfd.reject();
      return dfd.promise();
    }
    var wookiee = {};
    wookiee.page = data;
    wookiee.page.replace("{{interlang", "{{Interlang");
    wookiee.sections = wookiee.page.split("==");
    console.log(wookiee.sections);
    wookiee.appearances = '';
    wookiee.sources = '';
    wookiee.bibliography = '';
    wookiee.cast = '';
    for (var i=0; i<wookiee.sections.length; i++)
    {
      if ($.trim(wookiee.sections[i]) == "Appearances")
      {
        wookiee.appearances = wookiee.sections[i+1];
        //TODO: Verficar por aparições não canônicas
      }
      else if ($.trim(wookiee.sections[i]) == "Sources")
      {
        wookiee.sources = wookiee.sections[i+1];
        break;
      }
      else if ($.trim(wookiee.sections[i]) == "Bibliography")
      {
        wookiee.bibliography = wookiee.sections[i+1];
      }
      else if ($.trim(wookiee.sections[i]) == "Cast")
      {
        wookiee.cast = wookiee.sections[i+1];
      }
    }
    articleWikitext += "\n\n";
    var addDisclaimer = (wookiee.appearances || wookiee.bibliography || wookiee.cast || wookiee.sources) ? ["{{ICPDisclaimer}}", "|icp=1"] : ["", ''];
    var successionBoxText;
    if (wookiee.appearances.search(/\{\{Start(_| )box\}\}/) >= 0)
      successionBoxText = "appearances";
    else if (wookiee.sources.search(/\{\{Start(_| )box\}\}/) >= 0)
      successionBoxText = "sources";
    else
      successionBoxText = false;
    if (wookiee.sources.search("{{Interlang") >= 0)
      wookiee.sources = wookiee.sources.split("{{Interlang")[0]; //Tratar erro
    if (wookiee.page.search("{{Interlang") >= 0)
    {
      var wookieeInterlang = addDisclaimer[0]+"{{Interlang\n|en="+$("#wookieePage").val()+wookiee.page.split("{{Interlang")[1].split("}}")[0]+addDisclaimer[1]+"}}"; //Tratar erro
      //Adding HotCat data
      var hotcatInterlinks = wookiee.page.split("{{Interlang")[1].split("}}")[0].split("|");
      for (i=0; i<hotcatInterlinks.length; i++)
        hotcatInterlinks[i] = hotcatInterlinks[i].replace("=", ":").replace(/\n/g, ''); //Yep, only the first "="
      userActions.hotCatData = 'pt:'+encodeURIComponent(articleName+hotcatInterlinks.join("|"));
    }
    else
    {
      var wookieeInterlang = addDisclaimer[0]+"{{Interlang\n|en="+$("#wookieePage").val()+"\n"+addDisclaimer[1]+"\n}}";
      userActions.hotCatData = 'pt:'+encodeURIComponent(articleName);
    }
    if (successionBoxText)
    {
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\{\{Start(_| )box\}\}/g, '{{Traduzir}}{{Caixa inicio}}');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\{\{Succession(_| )box\s*\|/g, '{{Caixa de sucessão\n|');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\|\s*title\s*\=\s*/g, '|titulo = ');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\|\s*years\s*\=\s*/g, '|anos = ');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\|\s*before\s*\=\s*/g, '|antes = ');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\|\s*before\-years\s*\=\s*/g, '|antes-anos = ');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\|\s*after\s*\=\s*/g, '|depois = ');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\|\s*after\-years\s*\=\s*/g, '|depois-anos = ');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\{\{End(_| )box\}\}/g, '{{Caixa fim}}');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\[\[(\d+) ABY(\]\]|\|)/g, '[[$1 DBY$2');
      wookiee[successionBoxText] = wookiee[successionBoxText].replace(/\[\[(\d+) BBY(\]\]|\|)/g, '[[$1 ABY$2');
      console.log(wookiee[successionBoxText]);
      userActions.successionBox = true;
    }
    else
      userActions.successionBox = false;
    if (wookiee.cast != '' && outOfUniverse == 1)
      articleWikitext += "== Elenco =="+wookiee.cast;
    if (wookiee.appearances != '' && outOfUniverse == false)
      articleWikitext += "== Aparições =="+wookiee.appearances;
    if (wookiee.sources != '')
      articleWikitext += "== Fontes =="+wookiee.sources;
    if (wookiee.bibliography != '' && outOfUniverse)
      articleWikitext += "== Bibliografia =="+wookiee.bibliography;
    articleWikitext += wookieeInterlang;
    ajaxGet(wikiBaseURL+"Star_Wars_Wiki:Ap%C3%AAndice_de_Tradu%C3%A7%C3%A3o_de_obras/JSON?action=raw", function(data) {
      var fixes = JSON.parse(data.replace("<pre>", '').replace("</pre>", ''));
      console.log("Apêndice de obras obtido.");
      for (var i=0; i<fixes.replacements.length; i++) {
        var txtRegEx = new RegExp(fixes.replacements[i][0], "g");
        articleWikitext = articleWikitext.replace(txtRegEx, fixes.replacements[i][1]);
      }
      dfd.resolve();
    });
    return dfd.promise();
  }

  //Step3 helper: wookiee page validator
  var redirectPageIfWookieeIsRedirect = function(data) {
    if (data.toLowerCase().substring(0, 9) == "#redirect")
    {
      $("#wookieePage").val(data.split("[[")[1].split("]]")[0]);
      getWookieeData($("#wookieePage").val());
      return true;
    }
    return false;
  }

  //Step4: Categorize
  var categoriesInsertion = function ()
  {
    var dfd = $.Deferred();
    updateModalTitle("Passo 4: Categorias");
    var modalContent = '<p>Para finalizar, categorize o artigo. Lembre-se de não ser reduntante: se categorizar '+
    'o artigo como "Mestre Jedi", por exemplo, NÃO o categorize como "Jedi".</p>';
    userActions.categorias = true;
    deltaTime = new Date().getTime();
    if (window.wgAction == 'edit')
    {
      updateModalBody(modalContent);
      $("div [data-id='categories']").appendTo("#CuratedContentToolModal section");
      appendButtonToModalBody("Terminei").then(function(button) {
        $("div [data-id='categories']").insertAfter("div [data-id='insert']");
        userActions.passo4DT = (new Date().getTime()) - deltaTime;
        dfd.resolve();
      });
    }
    else
    {
      //For VE, we'll simply redirect user to VE's categories interface
      modalContent += '<p>Para isso, clique em "Categorias" no Editor Visual conforme lhe é apresentado e preencha o campo '
      +'com as categorias. Quando terminar, clique no botão "Aplicar mudanças".</p>';
      updateModalBody(modalContent);
      appendButtonToModalBody("Ok, vamos lá").then(function(button) {
        $("#blackout_CuratedContentToolModal").removeClass('visible');
      });
      $($("div.oo-ui-toolbar-tools div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup")[0]).addClass('oo-ui-popupToolGroup-active oo-ui-popupToolGroup-left');
      $("span.oo-ui-tool-name-categories").css('border', '1px solid');
      $("span.oo-ui-tool-name-categories a").click(function() {
        setTimeout(function() {
          $("div.oo-ui-processDialog-actions-primary .oo-ui-buttonElement-button").click(function () {
            userActions.passo4DT = (new Date().getTime()) - deltaTime;
            $("span.oo-ui-tool-name-categories").css('border', '0px solid');
            $("#blackout_CuratedContentToolModal").addClass('visible');
            dfd.resolve();
          });
        }, 1500);
      });
      $("div.oo-ui-layout.oo-ui-panelLayout.oo-ui-panelLayout-scrollable.oo-ui-panelLayout-expanded.oo-ui-pageLayout:nth-of-type(3)").appendTo("#CuratedContentToolModal section");
    }
    return dfd.promise();
  }

  //Wrapping up
  var finishEdit = function ()
  {
    if ((articleWikitext.match(/\{\{Interlang/g) || []).length == 1) {
      var hasDisclaimer = articleWikitext.search("{{ICPDisclaimer}}") > -1;
      articleWikitext = articleWikitext.replace("{{ICPDisclaimer}}", "");
      articleWikitext = articleWikitext.split("{{Interlang")[0] + "== Notas e referências ==\n{{Reflist}}\n\n" +
      (hasDisclaimer ? "{{ICPDisclaimer}}" : "")  + "{{Interlang" + articleWikitext.split("{{Interlang")[1];
    } else
      articleWikitext += "\n\n== Notas e referências ==\n{{Reflist}}";
    articleWikitext += "\n\n"+"<!-- Artigo gerado pelo ICP -->";
    if (window.wgAction == "view")
    {
      //Visual Editor
      var targetButtonText = $("span.oo-ui-tool-name-wikiaSourceMode span.oo-ui-tool-title").text();
      alert("Por favor, clique em \""+targetButtonText+"\" e aguarde alguns segundos.");
      $("#CuratedContentToolModal span.close").click();
      $($("div.oo-ui-toolbar-tools div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup")[0]).addClass('oo-ui-popupToolGroup-active oo-ui-popupToolGroup-left');
      $("span.oo-ui-tool-name-wikiaSourceMode").css('border', '1px solid');
      $("span.oo-ui-tool-name-wikiaSourceMode a").click(function() {
        setTimeout(function() {
          if ($("textarea.ui-autocomplete-input").val().search("\\[\\[Categoria:") >= 0)
            $("textarea.ui-autocomplete-input").val(articleWikitext+"\n\n"+$("textarea.ui-autocomplete-input").val());
          else
            $("textarea.ui-autocomplete-input").val(articleWikitext);
          $("textarea.ui-autocomplete-input").change();
          setTimeout(function() {$("div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-labelElement.oo-ui-flaggedElement-progressive.oo-ui-flaggedElement-primary.oo-ui-buttonWidget.oo-ui-actionWidget.oo-ui-buttonElement-framed a.oo-ui-buttonElement-button").click();}, 1000);
        }, 2000);
      });
    }
    else
    {
      //Source editor and WYSIWYG editor
      if (ICP_wys && $("[id=wpTextbox1]").length > 1) //For now, since there are two textareas with id=wpTextbox1 (nice job, Fandom ¬¬)
        $('#wpTextbox1').attr('id', 'wpTextbox0');
      var theTextarea = ($('#cke_contents_wpTextbox1 textarea')[0] || $('#wpTextbox1')[0]);
      if (theTextarea.value.toLowerCase().search("\\[\\[file:placeholder") >= 0) //Because of Fandom's "standard layout" option
        theTextarea.value = articleWikitext;
      else
        theTextarea.value += articleWikitext;
      $("#CuratedContentToolModal span.close").click();
      if (ICP_wys == true)
        setTimeout(function() {window.CKEDITOR.tools.callFunction(59)}, 1500);
    }
  }

  var sendFeedback = function() {
    //This is meant for collecting info about how people use this tool so that I can improve it a lot more. I am only sending people's hashID because I need to know whether the data is from different people or not. This is also used to collect info when errors occur
    $.ajax({
      url:"https://www.99luca11.com/sww_helper",
      type: "POST",
      crossDomain: true,
      data: userActions,
      timeout: 7000,
      success: function(data) {
        console.log("Dados coletados: "+data);
      },
      error: function(data) {
        console.log("Envio malsucedido");
      }
    })
  }

  var encodarURL = function(qm) {
    return encodeURI(qm.replace(/ /g, "_"))
  }

  var init = function() {
    userActions.user = (window.wgTrackID || false);
    userActions.page = window.wgPageName;
    userActions.date = window.wgNow;
    userActions.whereFrom = document.location.href; //So that I know if they're coming from redlinks, Special:CreatePage or other flows
    userActions.version = ICPversion;
    userActions.errors = []
    if (window.wgArticleId === 0 && (window.wgNamespaceNumber == 114 || window.wgNamespaceNumber === 0) || (window.wgNamespaceNumber == -1 && window.wgTitle == "CreatePage"))
    {
      if (window.wgNamespaceNumber == -1)
      {
        $("#ok").click(function () {errorHandler(function () {
          if (typeof document.editform.wpTitle === "undefined")
            return;
          userActions.page = document.editform.wpTitle.value;
          articleName = document.editform.wpTitle.value;
          if (articleName.substr(0, 8) == "Legends:")
          {
            articleTitle = articleName.substr(8);
            isCanonNamespace = false;
          }
          else
          {
            articleTitle = articleName;
            isCanonNamespace = true;
          }
        })});
      }
      else
      {
        articleName = window.wgPageName;
        articleTitle = window.wgTitle;
        if (window.wgNamespaceNumber == 0)
          isCanonNamespace = true;
        else
          isCanonNamespace = false;
      }
      var opcoesICP = {}
      if (localStorage.ICPsettings) {
        opcoesICP = JSON.parse(localStorage.ICPsettings);
        userActions.ICPconfig = localStorage.ICPsettings;
      } else {
        opcoesICP.default_action = 1;
        userActions.ICPconfig = false;
      }
      if (opcoesICP.default_action == 0)
      {
        $("#WikiaBarWrapper ul.tools").append('<li id="ICP_opener"><a href="#">Int. Criação Página</a></li>');
        $("#ICP_opener").click(function() { errorHandler(controller); });
      }
      else
      {
        if (window.wgAction == 'edit')
          errorHandler(controller);
        if (window.wgAction == 'view')
          if (document.location.href.search("veaction=edit") >= 0)
            errorHandler(controller);
          else
            $("#ca-ve-edit").click(function () { errorHandler(controller); });
      }
    }

  }

  $(document).ready(init);
  return {
    isAlt: false //Key control
  }
})(jQuery);

