/**
 * Page Creation Interface (ICP) is a framework for a helping tool for creating new articles.
 * It has been running for years now at Star Wars Wiki em Português, helping new-comers to create
 * new pages with appropriate structure and standards. It has since been extracted to provide a
 * useful framework so that other communities can use it to build their own helping tool.
 * 
 * @author Thales César
 * @version 0.1.0-beta.0
 * @description Page Creation Interface framework
 */
var ICP = (function($) {
  "use strict";

  var ICPversion = '0.1.0-beta.0';

  /**
   * ICP framework class
   */
  var ICP = function() {
    this.version = ICPversion;
    this.articleName;
    this.articleTitle;
    this.articleWikitext = new Array(5);
    this.wysiwyg = false;
    this.userActions = {};
    this.mwApi = null;
    this.VESurface = null;
    this.sendFeedbackEnabled = false;
    this.closeFeedbackEnabled = false;
    this.wikitextAutoReset = true;
    this._currentStep = null;
    this.replaceArticleWikitext = false;
    this.replaceFandomStandardLayout = true;
  };

  /**
   * Wraps a given function in order to handle any untreated exceptions
   * 
   * Inspired by https://blog.sentry.io/2016/01/04/client-javascript-reporting-window-onerror
   * 
   * @param {Function} fn Function to be wrapped
   * @returns {Function} Wrapped function
   */
  ICP.prototype.errorHandler = function(fn) {
    var instance = this;
    fn.__errorHandler__ = function() {
      try {
        return fn.apply(instance, arguments);
      }
      catch(e) {
        console.error(e.toString());
        var erroTxt = e.name + ": " + e.message
        erroTxt += (typeof e.stack === "undefined") ? '' : ' - ' + e.stack;
        instance.userActions.errors.push(erroTxt);
        instance.userActions.userAgent = window.navigator.userAgent;
        alert("Ocorreu um erro. "+(instance.sendFeedbackEnabled ? "Um relatório sobre esse inconveniente está sendo enviado para os administradores." : "") + "Sua edição até aqui será salva.");
        instance.finishEdit();
      }
    }
    return fn.__errorHandler__;
  }

  ICP.prototype.treatError = function(msg) {
    console.warn(msg);
    this.userActions.errors.push(msg);
    this.userActions.userAgent = window.navigator.userAgent;
    alert("Ocorreu um erro. "+(this.sendFeedbackEnabled ? "Um relatório sobre esse inconveniente está sendo enviado para os administradores." : "") + "Sua edição até aqui será salva.");
    this.finishEdit();
  }

  /**
   * Peforms a GET request on given URL
   *
   * @param {String} url URL to be called
   * @param {Function} successCallback Success callback
   * @param {Function} [errorCallback] Error callback
   */
  ICP.prototype.ajaxGet = function(url, successCallback, errorCallback) {
    this.showLoader();
    var instance = this;
    $.ajax({
      method: "GET",
      url: url,
      success: this.errorHandler(function(data) {
        instance.hideLoader();
        successCallback(data);
      }),
      error: errorCallback || this.retryAjax
    });
  }
  
  /**
   * Peforms a MediaWiki API get request with given parameters
   * 
   * @param {Object} options MediaWiki API options
   * @param {Function} successCallback Success callback
   * @param {Function} [errorCallback] Error callback
   */
  ICP.prototype.apiGet = function(options, successCallback, errorCallback) {
    var instance = this;
    if (this.mwApi === null) {
      console.warn('ICP: mwApi null, forcing its load');
      this.forceMwApiLoad();
      mw.loader.using('mediawiki.api', function() {
        console.debug('ICP: mediawiki.api loaded');
        instance.mwApi = new mw.Api();
        this.apiGet(options, successCallback, errorCallback);
      });
      return;
    }
    this.showLoader();
    this.mwApi.get(options).then(this.errorHandler(function(data) {
      instance.hideLoader();
      successCallback(data);
    })).fail(errorCallback || this.retryAjax);
  }

  /**
   * Gets given article's wikitext content
   * 
   * @param {String} pagename Wiki article title
   * @returns {Promise} Success callback or rejected when page is not found
   */
  ICP.prototype.apiGetPageContents = function(pagename) {
    var dfd = $.Deferred();
    this.apiGet({action: 'query', prop: 'revisions', titles: pagename, rvprop: 'content'}, function(data) {
      var pageId = Object.keys(data.query.pages)[0];
      if (pageId == '-1') dfd.reject();
      dfd.resolve(data.query.pages[pageId].revisions[0]['*']);
    });
    return dfd.promise();
  }

  /**
   * Forces mediawiki.api module to load
   * 
   * During Selenium test suite runs, some random tests would consistently break
   * because mediawiki.api would get stuck at "loading" status. This forces mw.Api
   * to load by calling it directly, bypassing any cache or mw.loader controll.
   * With any luck, this should not happen in production
   */
  ICP.prototype.forceMwApiLoad = function() {
    mw.loader.load("https://slot1-images.wikia.nocookie.net/__load/-/debug%3Dfalse%26lang%3Dpt-br%26skin%3Doasis%26version%3D1591798434636-20200610T140000Z/mediawiki.api");
  }

  ICP.prototype.retryAjax = function(xhr, textStatus, error) {
    this.hideLoader();
    if (xhr.status >= 400 && xhr.status < 500) {
      this.treatError(xhr.toString());
    } else {
      alert("Erro ao carregar informações da wiki. Tentando novamente em 30 segundos...");
      var ajaxSettings = this;
      console.log(this);
      setTimeout(function() {
        this.showLoader();
        $.ajax(ajaxSettings);
      }, 30000);
    }
  }

  /**
   * ICP logic flow manager
   * 
   * @param {Function[]} steps ICP steps functions
   * @param {Object} [options] ICP flow options
   * @param {Boolean} [options.anon] Whether to confirm anons intention before proceeding
   */
  ICP.prototype.controller = function(steps, options) {
    options = options || {anon: true};
    this.buildModal();
    this.buildProgressBar();
    if (options.anon) steps.unshift(this.confirmAnon);
    this._controller(steps);
  }

  ICP.prototype._controller = function(steps) {
    this._currentStep = steps[0];
    if (steps.length === 0) return this.finishEdit();
    var instance = this;
    $.when(this.errorHandler(steps.shift()).apply(this)).then(function() {
      instance.updateProgressBar(steps);
      instance._controller(steps);
    });
  };

  //Helpers
  /**
   * Checks if current page is Special:CreatePage
   * 
   * @returns {Boolean} True if current page is Special:CreatePage
   */
  ICP.prototype.isSpecialCreatePage = function() {
    return mw.config.get("wgNamespaceNumber") == -1 && mw.config.get("wgTitle") == "CreatePage";
  }

  /**
   * Checks if current page belongs to main namespace (ns 0)
   * 
   * @returns {Boolean} True if current namespace is 0
   */
  ICP.prototype.isMainNamespace = function() {
    return mw.config.get("wgNamespaceNumber") === 0;
  }

  /**
   * Checks if current page is a new article
   * 
   * @returns {Boolean} True if current article is new
   */
  ICP.prototype.isNewArticle = function() {
    return mw.config.get("wgArticleId") === 0;
  }

  /**
   * Article wikitext manager
   * 
   * Each step should produce only one small piece of the
   * generated wikitext for the article structure. As such,
   * step's funcions should use this class to correctly and
   * independently manage its wikitext
   * 
   * @param {ICP} icp ICP instance
   * @param {Number} stepIndex Step index number
   */
  var StepWikitext = function(icp, stepIndex) {
    this.icp = icp;
    this.index = stepIndex;
    if (this.icp.articleWikitext[this.index] === undefined || this.icp.wikitextAutoReset)
      this.icp.articleWikitext[this.index] = "";
  }

  /**
   * Resets step's accumulated wikitext
   */
  StepWikitext.prototype.reset = function() {
    this.icp.articleWikitext[this.index] = "";
  }

  /**
   * Appends wikitext code to accumulated step's wikitext
   * 
   * @param {String} text Wikitext code
   */
  StepWikitext.prototype.append = function(text) {
    this.icp.articleWikitext[this.index] += text;
  }

  /**
   * Returns generated step's wikitext
   * 
   * @returns {String} Wikitext code
   */
  StepWikitext.prototype.get = function() {
    return this.icp.articleWikitext[this.index];
  }

  /**
   * Builds ICP's modal
   */
  ICP.prototype.buildModal = function() {
    if (document.getElementById("blackout_CuratedContentToolModal") != "null")
      $("#blackout_CuratedContentToolModal").remove();
    $(document.head).append('<link rel="stylesheet" href="https://slot1-images.wikia.nocookie.net/__am/7900017900012/sass/background-dynamic%3Dtrue%26background-image%3Dhttps%253A%252F%252Fvignette.wikia.nocookie.net%252Fpt.starwars%252Fimages%252F5%252F50%252FWiki-background%252Frevision%252Flatest%253Fcb%253D20180407180604%26background-image-height%3D820%26background-image-width%3D1920%26color-body%3D%2523ddedfd%26color-body-middle%3D%2523ddedfd%26color-buttons%3D%25232f8f9d%26color-community-header%3D%25232f8f9d%26color-header%3D%25232f8f9d%26color-links%3D%2523006cb0%26color-page%3D%2523ffffff%26oasisTypography%3D1%26page-opacity%3D100%26widthType%3D0/resources/wikia/ui_components/modal/css/modal_default.scss" />');
    $('body').append('<div id="blackout_CuratedContentToolModal" class="modal-blackout visible">'
      +'<div id="CuratedContentToolModal" class="modal medium no-scroll curated-content-tool-modal ">'
        +'<header>'
          +'<span class="close">Close</span>'
            +'<img alt="Carregando" src="https://slot1-images.wikia.nocookie.net/__cb1591343180920/common/skins/common/images/ajax.gif" style="vertical-align: baseline; display: none; border: 0px;" />'
            +'<h3 style="display: inline;"></h3>'
        +'</header>'
        +'<nav></nav>'
        +'<section></section>'
        +'<footer>'
          +'<button id="configuracoesICP" class="secondary">Configurações</button>'
          +'<span id="ICPVersion" style="display:none">'+ICPversion+'</span>'
        +'</footer>'
      +'</div>'
    +'</div>');
    this._setModalButtonsCallbacks();
  }

  ICP.prototype._setModalButtonsCallbacks = function() {
    var instance = this;
    $("#CuratedContentToolModal span.close").click(function() {
      //Many people seem to leave in the middle of the process, so let's ask them why
      if (instance.closeFeedbackEnabled)
        instance.userActions.closeFeedback = prompt("Por favor, nos ajude a deixar essa ferramenta ainda melhor. Diga-nos o motivo de estar abandonando o processo no meio.") || false;
      instance._finish();
    });

    $("#configuracoesICP").click(function () {
      //Config modal
      var configModal = "<form name='config_form'><p><label>Abrir Interface de Criação de Páginas sempre que iniciar nova página."+
      "<input type='checkbox' name='default_action' checked /></label></p></form>"+
      '<p><a href="https://starwars.fandom.com/pt/wiki/Utilizador:Thales_C%C3%A9sar/ICP" target="_blank">Sobre a ICP</a> - versão '+instance.version+' ('+ICPversion+')</p>';
      var buttons = [
        {
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
        }
      ];
      if (instance.sendFeedbackEnabled) { 
        buttons.unshift({
          message: 'Enviar feedback',
          handler: function() {
            var feedbackTxt = prompt("Envie um comentário sobre essa ferramenta para os administradores: ");
            if (feedbackTxt)
            {
              instance.userActions.msgFeedback = feedbackTxt
              instance.sendFeedback();
              alert("Obrigado!");
            }
          }
        })
      }
      $.showCustomModal('Configurações', configModal, {
        id: 'ModalSettingsWindow',
        width: 600,
        height: 250,
        buttons: buttons
      });
    });
    $("#finalizarEdicao").click(function () {
      this.finishEdit();
    });
  }

  ICP.prototype.buildProgressBar = function() {
    var instance = this;
    var olElement = document.createElement("ol");
    olElement.style.textAlign = "center";
    olElement.style.padding = "5px 0";
    var numSteps = this.getSteps().length;
    for (var i = 0; i < numSteps; i++) {
      var liElement = document.createElement("li")
      liElement.style.width = 100 / numSteps + "%";
      if (i === 0) liElement.className = "active";
      else liElement.className = "disabled";
      liElement.onclick = function() {
        instance._handleProgressBarClick(this);
      }
      var divElement = document.createElement("div");
      divElement.textContent = i+1;
      liElement.appendChild(divElement);
      olElement.appendChild(liElement);
    }
    $("#CuratedContentToolModal nav").html(olElement);
  }

  ICP.prototype.updateProgressBar = function(remainingSteps) {
    var liElements = $("#CuratedContentToolModal nav ol li");
    var numSteps = this.getSteps().length;
    var numRemainingSteps = remainingSteps.length;
    var stepIndex = numSteps - numRemainingSteps;
    for (var i = 0; i < numSteps; i++) {
      var liElement = liElements[i];
      if (i < stepIndex) liElement.classList = "past";
      else if (i > stepIndex) liElement.classList = "disabled";
      else liElement.classList = "active";
    }
  }

  ICP.prototype._handleProgressBarClick = function(item) {
    if (item.className != "past") return;
    this._currentStepExit();
    var selectedIndex = item.textContent - 1;
    var steps = this.getSteps();
    var stepsSliced = steps.slice(selectedIndex);
    this.updateProgressBar(stepsSliced);
    this._controller(stepsSliced);
  }

  ICP.prototype._currentStepExit = function() {
    try {
      if (this._currentStep && typeof this._currentStep.__exit__ === "function") this._currentStep.__exit__();
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * Updates modal's content
   *
   * @param {String|HTMLElement} content HTML content
   */
  ICP.prototype.updateModalBody = function(content) {
    $("#CuratedContentToolModal section").html(content);
  }

  /**
   * Updates modal's title
   *
   * @param {String} title Modal's title
   */
  ICP.prototype.updateModalTitle = function(title) {
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
  ICP.prototype.appendButtonToModalBody = function(label, options) {
    options = options || {};
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
   * Manager for building infobox inside ICP modal
   * 
   * @param {String} content HTML content for description
   * @param {String} title Infobox's title
   * @param {Object} [options] Options
   * @param {String} [options.infoboxClassList] Infobox class list
   */
  var ModalInfobox = function(content, title, options) {
    options = options || {};
    var container = document.createElement("div");
    container.style.position = "relative";
    var contentDiv = document.createElement("div");
    contentDiv.style.position = "fixed";
    contentDiv.innerHTML = content;
    container.appendChild(contentDiv);
    var infoboxRoot = document.createElement("aside");
    infoboxRoot.classList = options.infoboxClassList || "portable-infobox pi-background pi-theme-Media pi-layout-default";
    var infoboxTitle = document.createElement("h2");
    infoboxTitle.classList = "pi-item pi-item-spacing pi-title";
    infoboxTitle.innerText = title;
    infoboxRoot.appendChild(infoboxTitle);
    container.appendChild(infoboxRoot);
    this.container = container;
    this.infoboxRoot = infoboxRoot;
    this.textareaValues = {};
  }

  /**
   * Adds a infobox field with textarea for user to write
   * 
   * @param {String} label Infobox field label
   * @param {String} source Infobox field source name
   * @param {Object} [options] Field options
   * @param {String} [options.value] Textarea initial value
   * @param {HTMLElement} [options.element] Infobox field value (defaults to textarea)
   */
  ModalInfobox.prototype.addInfoboxField = function(label, source, options) {
    options = options || {};
    var infoboxField = document.createElement("div");
    infoboxField.classList = "pi-item pi-data pi-item-spacing pi-border-color";
    var infoboxFieldLabel = document.createElement("h3");
    infoboxFieldLabel.classList = "pi-data-label pi-secondary-font";
    infoboxFieldLabel.textContent = label;
    var infoboxFieldValue = document.createElement("div");
    infoboxFieldValue.classList = "pi-data-value pi-font";
    if (options.element) {
      infoboxFieldValue.appendChild(options.element);
    } else {
      var textarea = document.createElement("textarea");
      textarea.placeholder = "Preencher";
      if (options.value) textarea.value = options.value;
      infoboxFieldValue.appendChild(textarea);
      this.textareaValues[source] = textarea;
    }
    infoboxField.appendChild(infoboxFieldLabel);
    infoboxField.appendChild(infoboxFieldValue);
    this.infoboxRoot.appendChild(infoboxField);
  }

  /**
   * 
   * @param {String} label Infobox field label
   * @param {String} source Infobox field source name
   * @param {Object} selectOptions Select options
   * @param {String} selectOptions.id Select id
   * @param {Function} selectOptions.callback Select callback for change event
   * @param {Object[]} selectOptions.options Select options for select's options
   * @param {String} selectOptions.options[].value Select element value
   * @param {String} selectOptions.options[].label Select element label
   */
  ModalInfobox.prototype.addInfoboxFieldSelect = function(label, source, selectOptions) {
    var select = document.createElement("select");
    if (selectOptions.id) select.id = selectOptions.id;
    selectOptions.options.forEach(function(option) {
      var optionElem = document.createElement("option");
      optionElem.value = option.value;
      optionElem.textContent = option.label;
      select.appendChild(optionElem);
    });
    if (selectOptions.callback) $(select).change(selectOptions.callback);
    this.addInfoboxField(label, source, {element: select});
    this.textareaValues[source] = select;
  }

  /**
   * Returns infobox root element
   * 
   * @returns {HTMLElement} Aside element
   */
  ModalInfobox.prototype.getInfoboxRoot = function() {
    return this.infoboxRoot;
  }

  /**
   * Inserts infobox content into modal
   */
  ModalInfobox.prototype.getContent = function() {
    return this.container;
  }

  /**
   * Returns all user input on all textareas by source field name
   * 
   * @returns {Object} User input by field
   */
  ModalInfobox.prototype.getValues = function() {
    var values = {}
    for (var source in this.textareaValues) {
      values[source] = this.textareaValues[source].value;
    }
    return values;
  }

  /**
   * Resizes modal's window
   *
   * @param {String} size CSS width
   */
  ICP.prototype.resizeModal = function(size) {
    $("#CuratedContentToolModal").css('width', size || "");
  }

  /**
   * Shows modal's AJAX loader gif
   */
  ICP.prototype.showLoader = function() {
    $("#CuratedContentToolModal header img").show();
  }

  /**
   * Hides modal's AJAX loader gif
   */
  ICP.prototype.hideLoader = function() {
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
  ICP.prototype.insertArticleTypeTable = function(articleTypes, options) {
    options = options || {};
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
    this.updateModalBody(rootDiv.innerHTML);

    $("#NovaPaginaTipoDeArtigo>div").one("click", function() {
      dfd.resolve($(this).attr("data-tipo"));
    });
    return dfd.promise();
  }

  //Pre-Step0: Confirm anons intention on creating an article
  ICP.prototype.confirmAnon = function() {
    var dfd = $.Deferred();
    if (this.userActions.user === false && document.location.href.search("redlink=1") >= 0)
    {
      //Many anons get here accidentally, so let's confirm they really intend to create a new article
      var instance = this;
      var modalContent = '<p>Você seguiu para uma página que não existe. Para criá-la, clique em "Continuar". '+
      'Para voltar a navegar na <i>Star Wars Wiki</i> em Português, clique em "Voltar".</p>';
      $("#configuracoesICP").hide();
      this.resizeModal("500px");
      this.updateModalBody(modalContent);
      this.updateModalTitle("Criando um novo artigo");
      this.appendButtonToModalBody("Voltar", {secondary: true}).then(function(button) {
        window.history.back();
      });
      this.appendButtonToModalBody("Continuar", {style: "float: right;"}).then(function(button) {
        instance.resizeModal();
        $("#configuracoesICP").show();
        dfd.resolve();
      });
    } else
      dfd.resolve();
    return dfd.promise();
  }

  //Wrapping up
  ICP.prototype.finishEdit = function() {
    console.log(this.articleWikitext);
    this.articleWikitext = this.articleWikitext.join("");
    this.articleWikitext += "\n\n"+"<!-- Artigo gerado pelo ICP -->";
    this.articleWikitext += "\n<!-- Gerado às "+new Date().toString()+"-->";
    this._currentStepExit();
    var instance = this;
    if (window.wgAction == "view") {
      //Visual Editor
      instance.mwApi.post({
        action: "visualeditor",
        paction: "parsefragment",
        page: this.articleName,
        wikitext: this.articleWikitext
      }).then(function(data) {
        //For UCP, this may be replaced for https://doc.wikimedia.org/VisualEditor/master/#!/api/mw.libs.ve.targetLoader-method-requestParsoidData
        instance._finish();
        instance.VESurface.getView().focus();
        var wikiDocument = new DOMParser().parseFromString(data.visualeditor.content, "text/html");
        var VEDocument = ve.dm.converter.getModelFromDom(wikiDocument);
        instance.VESurface.getModel().getFragment().insertDocument(VEDocument);
        //For UCP's source mode, the following should be enough:
        // instance.VESurface.getModel().getFragment().insertContent(instance.articleWikitext);
        //FYI, VESurface.mode == "visual" is the way to check for the mode
      });
      this.updateModalBody("<p>Carregando suas edições...</p>");
    } else {
      //Source editor and WYSIWYG editor
      if ($("[id=wpTextbox1]").length > 1) //There may be two textareas with id=wpTextbox1 🤷
        $('#wpTextbox1').attr('id', 'wpTextbox0');
      var theTextarea = ($('#cke_contents_wpTextbox1 textarea')[0] || $('#wpTextbox1')[0]);

      var hasStandardLayout = theTextarea.value.toLowerCase().search("\\[\\[file:placeholder") >= 0;
      if (this.replaceArticleWikitext || (this.replaceFandomStandardLayout && hasStandardLayout))
        theTextarea.value = this.articleWikitext;
      else
        theTextarea.value += this.articleWikitext;
      this._finish();
      if (this.wysiwyg == true) this.changeSourceToWys();
    }
  }

  ICP.prototype._finish = function() {
    $("#blackout_CuratedContentToolModal").removeClass('visible');
    if (this.sendFeedbackEnabled) this.sendFeedback();
  }

  ICP.prototype.encodeURL = function(txt) {
    return encodeURI(txt.replace(/ /g, "_"))
  }

  ICP.prototype.changeWysToSource = function() {
    this.userActions.editor = (mw.config.get("wgAction") == 'edit') ? "source" : "VE";
    if (mw.config.get("wgAction") == 'edit' && window.CKEDITOR && window.CKEDITOR.instances.wpTextbox1.mode == "wysiwyg") {
      window.CKEDITOR.tools.callFunction(56);
      this.wysiwyg = true;
      this.userActions.editor = "WYSIWYG";
    }
  }

  ICP.prototype.changeSourceToWys = function() {
    setTimeout(function() { window.CKEDITOR.tools.callFunction(59) }, 1500);
  }

  ICP.prototype._collectInitialMetrics = function() {
    this.userActions.user = (mw.config.get("wgUserId") || false);
    this.userActions.page = mw.config.get("wgPageName");
    this.userActions.date = new Date();
    this.userActions.whereFrom = document.location.href; //So that I know if they're coming from redlinks, Special:CreatePage or other flows
    this.userActions.version = [ICPversion, this.version];
    this.userActions.errors = [];
  }

  ICP.prototype._getICPSettings = function() {
    var settings = {};
    if (localStorage.ICPsettings) {
      settings = JSON.parse(localStorage.ICPsettings);
      this.userActions.ICPconfig = localStorage.ICPsettings;
    } else {
      settings.default_action = 1;
      this.userActions.ICPconfig = false;
    }
    return settings;
  }

  ICP.prototype.shouldOpenICP = function() {
    return ((this.isNewArticle() && this.isMainNamespace()) || this.isSpecialCreatePage())
  }

  ICP.prototype.setArticleTitle = function(articleTitle) {
    this.articleTitle = articleTitle;
  }

  ICP.prototype.sendFeedback = function() {
    return null;
  }

  ICP.prototype.init = function() {
    var instance = this;
    console.info('ICP init v'+this.version+' with base v'+ICPversion);
    mw.loader.using('mediawiki.api', function() {
      console.debug('ICP: mediawiki.api loaded');
      instance.mwApi = new mw.Api();
    });
    mw.hook("ve.activationComplete").add(function() {
      instance.VESurface = window.ve.init.target.getSurface();
    });
    this._collectInitialMetrics();
    if (!(this.shouldOpenICP())) return;
    if (this.isSpecialCreatePage()) {
      //TODO write Selenium tests for CreatePage entry point
      $("#ok").click(this.errorHandler(function () {
        if (typeof document.editform.wpTitle === "undefined")
          return;
        instance.userActions.page = document.editform.wpTitle.value;
        instance.articleName = document.editform.wpTitle.value;
        instance.setArticleTitle(instance.articleName);
      }));
    } else {
      this.articleName = mw.config.get("wgPageName");
      this.articleTitle = mw.config.get("wgTitle");
    }

    var ICPsettings = this._getICPSettings();
    var SWWSteps = this.getSteps();
    if (ICPsettings.default_action == 0) {
      $("#WikiaBarWrapper ul.tools").append('<li id="ICP_opener"><a href="#">Int. Criação Página</a></li>');
      $("#ICP_opener").click(function() {instance.controller(SWWSteps) });
    } else {
      if (mw.config.get("wgAction") == 'edit')
        this.controller(SWWSteps);
      if (mw.config.get("wgAction") == 'view')
        if (document.location.href.search("veaction=edit") >= 0)
          this.controller(SWWSteps);
        else
          $("#ca-ve-edit").click(function() {instance.controller(SWWSteps) });
    }
  }

  /**
   * Extends ICP subclass with its variables and functions
   * 
   * @param {ICP} module ICP subclass
   */
  var extend = function(module) {
    module.prototype = $.extend({}, ICP.prototype, module.prototype);
    Object.defineProperty(module.prototype, 'constructor', {
      value: module,
      enumerable: false,
      writable: true
    });
  }

  var exports = {
    ICP: ICP,
    ModalInfobox: ModalInfobox,
    StepWikitext: StepWikitext,
    extend: extend
  }

  $(document).ready(function() {
    mw.hook("dev.icp").fire(exports);
  });
  
  return exports
})(jQuery);
