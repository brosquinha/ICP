/**
 * Page Creation Interface (ICP) is a framework for a helping tool for creating new articles.
 * It has been running for years now at Star Wars Wiki em Português, helping new-comers to create
 * new pages with appropriate structure and standards. It has since been extracted to provide a
 * useful framework so that other communities can use it to build their own article creation tool.
 * 
 * @author Thales César
 * @version 2.0.1
 * @description Page Creation Interface framework
 */
var ICP = (function($) {
  "use strict";

  var ICPversion = '2.0.1';

  /**
   * ICP framework class
   * @exports ICP
   */
  var ICP = function() {
    this.version = ICPversion;
    this.articleName;
    this.articleTitle;
    this._currentStepIndex;
    this._deltaTime;
    this.articleWikitext = new Array(5);
    this.wysiwyg = false;
    this.userActions = {};
    this.mwApi = null;
    this.VESurface = null;
    this.anonMessage = true;
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
        var erroTxt = e.name + ": " + e.message;
        erroTxt += (typeof e.stack === "undefined") ? '' : ' - ' + e.stack;
        instance.userActions.errors.push(erroTxt);
        instance.userActions.userAgent = window.navigator.userAgent;
        alert("Ocorreu um erro. "+(instance.sendFeedbackEnabled ? "Um relatório sobre esse inconveniente está sendo enviado para os administradores." : "") + "Sua edição até aqui será salva.");
        instance.finishEdit();
      }
    };
    return fn.__errorHandler__;
  };

  ICP.prototype.treatError = function(msg) {
    console.warn(msg);
    this.userActions.errors.push(msg);
    this.userActions.userAgent = window.navigator.userAgent;
    alert("Ocorreu um erro. "+(this.sendFeedbackEnabled ? "Um relatório sobre esse inconveniente está sendo enviado para os administradores." : "") + "Sua edição até aqui será salva.");
    this.finishEdit();
  };

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
  };
  
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
  };

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
  };

  /**
   * Forces mediawiki.api module to load
   * 
   * During Selenium test suite runs, some random tests would consistently break
   * because mediawiki.api would get stuck at "loading" status. This forces mw.Api
   * to load by calling it directly, bypassing any cache or mw.loader controll.
   * With any luck, this should not happen in production.
   */
  ICP.prototype.forceMwApiLoad = function() {
    mw.loader.load("https://slot1-images.wikia.nocookie.net/__load/-/debug%3Dfalse%26lang%3Dpt-br%26skin%3Doasis%26version%3D1591798434636-20200610T140000Z/mediawiki.api");
  };

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
  };

  /**
   * ICP logic flow manager
   */
  ICP.prototype.controller = function() {
    var steps = this.getSteps();
    this.buildModal();
    this.buildProgressBar();
    if (this.anonMessage) steps.unshift(this.confirmAnon);
    mw.hook("dev.icp.init").fire();
    this._controller(steps);
  };

  ICP.prototype._controller = function(steps) {
    this._currentStep = steps[0];
    if (steps.length === 0) return this.finishEdit();
    
    this._handleStepStart(steps);
    var instance = this;
    $.when(this.errorHandler(steps.shift()).apply(this)).then(function() {
      instance._handleStepFinish(steps);
      instance._controller(steps);
    });
  };

  ICP.prototype._handleStepStart = function(remainingSteps) {
    this._currentStepIndex = this.getSteps().length - remainingSteps.length;
    this._deltaTime = new Date().getTime();
    this.updateProgressBar();
  };
  
  ICP.prototype._handleStepFinish = function() {
    this.userActions.stepsExecuted.push({
      index: this._currentStepIndex,
      timeTaken: (new Date().getTime()) - this._deltaTime
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
  };

  /**
   * Checks if current page belongs to main namespace (ns 0)
   * 
   * @returns {Boolean} True if current namespace is 0
   */
  ICP.prototype.isMainNamespace = function() {
    return mw.config.get("wgNamespaceNumber") === 0;
  };

  /**
   * Checks if current page is a new article
   * 
   * @returns {Boolean} True if current article is new
   */
  ICP.prototype.isNewArticle = function() {
    return mw.config.get("wgArticleId") === 0;
  };

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
   * @exports StepWikitext
   */
  var StepWikitext = function(icp, stepIndex) {
    this.icp = icp;
    this.index = stepIndex;
    if (this.icp.articleWikitext[this.index] === undefined || this.icp.wikitextAutoReset)
      this.icp.articleWikitext[this.index] = "";
  };

  /**
   * Resets step's accumulated wikitext
   */
  StepWikitext.prototype.reset = function() {
    this.icp.articleWikitext[this.index] = "";
  };

  /**
   * Appends wikitext code to accumulated step's wikitext
   * 
   * @param {String} text Wikitext code
   */
  StepWikitext.prototype.append = function(text) {
    this.icp.articleWikitext[this.index] += text;
  };
  
  /**
   * Returns generated step's wikitext
   * 
   * @returns {String} Wikitext code
   */
  StepWikitext.prototype.get = function() {
    return this.icp.articleWikitext[this.index];
  };

  /**
   * Builds ICP's modal
   */
  ICP.prototype.buildModal = function() {
    if (document.getElementById("blackout_CuratedContentToolModal") != "null") {
      $("#blackout_CuratedContentToolModal").remove();
      $("#ICPConfigModal").remove();
    }
    $('body').append('<div id="blackout_CuratedContentToolModal" class="wds-dialog__curtain curated-content-tool-modal__curtain" style="z-index:450">'
      +'<div id="CuratedContentToolModal" class="wds-dialog__wrapper no-scroll curated-content-tool-modal"'
          +' style="display: flex; flex-direction: column; max-width: 700px; width: 700px;">'
        +'<header class="wds-dialog__title" style="display: flex; justify-content: space-between;">'
          +'<h3 style="display: inline;"></h3>'
          +'<svg class="wds-icon curated-content-tool-modal__close" style="cursor: pointer;"><use href="#wds-icons-close"></use></svg>'
          +'<img alt="Carregando" src="https://slot1-images.wikia.nocookie.net/__cb1591343180920/common/skins/common/images/ajax.gif" style="vertical-align: baseline; display: none; border: 0px;" />'
        +'</header>'
        +'<nav></nav>'
        +'<section class="wds-dialog__content"></section>'
        +'<footer>'
          +'<div class="wds-dialog__actions">'
            +'<button id="configuracoesICP" class="wds-button wds-is-text create-page-dialog__button secondary">Configurações</button>'
            +'<span id="ICPVersion" style="display:none">'+ICPversion+'</span>'
          +'</div>'
        +'</footer>'
      +'</div>'
    +'</div>');
    this._setModalButtonsCallbacks();
  };

  ICP.prototype._setModalButtonsCallbacks = function() {
    var instance = this;
    $("#CuratedContentToolModal header>svg").click(function() {
      //Many people seem to leave in the middle of the process, so let's ask them why
      var minStepsLength = (instance.anonMessage) ? 1 : 0;
      var shouldAskForCloseFeedback = instance.closeFeedbackEnabled && instance.userActions.stepsExecuted.length > minStepsLength;
      if (shouldAskForCloseFeedback)
        instance.userActions.closeFeedback = prompt("Por favor, nos ajude a deixar essa ferramenta ainda melhor. Diga-nos o motivo de estar abandonando o processo no meio.") || false;
      instance._finish();
    });

    this._buildConfigModal();
    $("#configuracoesICP").click(function () {
      instance.windowManager.openWindow(instance.configModal);
    });
  };

  ICP.prototype._buildConfigModal = function() {
    var instance = this;
    function ICPConfigModal(config) {
      ICPConfigModal.super.call(this, config);
    }
    OO.inheritClass(ICPConfigModal, OO.ui.ProcessDialog);
    
    ICPConfigModal.static.name = 'ICPConfigDialog';
    ICPConfigModal.static.title = 'Configurações';
    ICPConfigModal.static.actions = [
      {action: 'save', label: 'Save', flags: 'primary'},
      {label: 'Cancel', flags: 'close'}
    ];
    if (this.sendFeedbackEnabled) ICPConfigModal.static.actions.push({label: 'Enviar feedback', action: 'feedback'});
    
    ICPConfigModal.prototype.initialize = function() {
      ICPConfigModal.super.prototype.initialize.apply(this, arguments);
      var configModal = "<form name='config_form'><p><label>Abrir Interface de Criação de Páginas sempre que iniciar nova página."+
      "<input type='checkbox' name='default_action' checked /></label></p></form>"+
      '<p><a href="https://starwars.fandom.com/pt/wiki/Star_Wars_Wiki%3AInterface_de_Cria%C3%A7%C3%A3o_de_P%C3%A1ginas" target="_blank">Sobre a ICP</a> - versão '+instance.version+' ('+ICPversion+')</p>';
      this.content = new OO.ui.PanelLayout({padded: true, expanded: false});
      this.content.$element.append(configModal);
      this.$body.append(this.content.$element);
    };

    ICPConfigModal.prototype.getActionProcess = function(action) {
      var dialog = this;
      if (action) {
        instance._handleConfigModalAction(action);
        return new OO.ui.Process(function () {
          dialog.close({action: action});
        });
      }
      return ICPConfigModal.super.prototype.getActionProcess.call(this, action);
    };
    
    this.windowManager = new OO.ui.WindowManager();
    $(document.body).append(this.windowManager.$element);
    
    this.configModal = new ICPConfigModal({id: "ICPConfigModal", size: "larger"});
    this.windowManager.addWindows([this.configModal]);
  }

  ICP.prototype._handleConfigModalAction = function(action) {
    if (action == "save") {
      var formRes = $('form[name="config_form"]').serialize();
      var settingsObj = {};
      if (formRes.search("default_action") > -1)
        settingsObj.default_action = 1;
      else
        settingsObj.default_action = 0;
      mw.storage.set("ICPsettings", JSON.stringify(settingsObj));
      alert("Alterações salvas!");
    } else if (action == "feedback") {
      var feedbackTxt = prompt("Envie um comentário sobre essa ferramenta para os administradores: ");
      if (feedbackTxt) {
        instance.userActions.msgFeedback = feedbackTxt;
        instance.sendFeedback();
        alert("Obrigado!");
      }
    }
  }

  ICP.prototype.buildProgressBar = function() {
    var instance = this;
    var olElement = document.createElement("ol");
    olElement.style.textAlign = "center";
    olElement.style.padding = "5px 0";
    var numSteps = this.getSteps().length;
    for (var i = 0; i < numSteps; i++) {
      var liElement = document.createElement("li");
      liElement.style.width = 100 / numSteps + "%";
      if (i === 0) liElement.className = "active";
      else liElement.className = "disabled";
      liElement.onclick = function() {
        instance._handleProgressBarClick(this);
      };
      var divElement = document.createElement("div");
      divElement.textContent = i+1;
      liElement.appendChild(divElement);
      olElement.appendChild(liElement);
    }
    $("#CuratedContentToolModal nav").html(olElement);
  };

  ICP.prototype.updateProgressBar = function() {
    var liElements = $("#CuratedContentToolModal nav ol li");
    var numSteps = this.getSteps().length;
    for (var i = 0; i < numSteps; i++) {
      var liElement = liElements[i];
      if (i < this._currentStepIndex) liElement.classList = "past";
      else if (i > this._currentStepIndex) liElement.classList = "disabled";
      else liElement.classList = "active";
    }
  };

  ICP.prototype._handleProgressBarClick = function(item) {
    if (item.className != "past") return;
    this._currentStepExit();
    var selectedIndex = item.textContent - 1;
    var steps = this.getSteps();
    var stepsSliced = steps.slice(selectedIndex);
    this._controller(stepsSliced);
  };

  ICP.prototype._currentStepExit = function() {
    try {
      if (this._currentStep && typeof this._currentStep.__exit__ === "function") this._currentStep.__exit__();
    } catch(e) {
      console.warn(e);
    }
  };

  /**
   * Updates modal's content
   *
   * @param {String|HTMLElement} content HTML content
   */
  ICP.prototype.updateModalBody = function(content) {
    $("#CuratedContentToolModal section").html(content);
  };

  /**
   * Updates modal's title
   *
   * @param {String} title Modal's title
   */
  ICP.prototype.updateModalTitle = function(title) {
    $("#CuratedContentToolModal header h3").text(title);
  };

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
  };

  /**
   * Manager for building infobox inside ICP modal
   * 
   * @param {String} content HTML content for description
   * @param {String} title Infobox's title
   * @param {Object} [options] Options
   * @param {String} [options.infoboxClassList] Infobox class list
   * @exports ModalInfobox
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
  };

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
  };

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
  };

  /**
   * Returns infobox root element
   * 
   * @returns {HTMLElement} Aside element
   */
  ModalInfobox.prototype.getInfoboxRoot = function() {
    return this.infoboxRoot;
  };

  /**
   * Inserts infobox content into modal
   */
  ModalInfobox.prototype.getContent = function() {
    return this.container;
  };

  /**
   * Returns all user input on all textareas by source field name
   * 
   * @returns {Object} User input by field
   */
  ModalInfobox.prototype.getValues = function() {
    var values = {};
    for (var source in this.textareaValues) {
      values[source] = this.textareaValues[source].value;
    }
    return values;
  };

  /**
   * Resizes modal's window
   *
   * @param {String} size CSS width
   */
  ICP.prototype.resizeModal = function(size) {
    $("#CuratedContentToolModal").css('width', size || "700px");
  };

  /**
   * Shows modal's AJAX loader gif
   */
  ICP.prototype.showLoader = function() {
    $("#CuratedContentToolModal header img").show();
  };

  /**
   * Hides modal's AJAX loader gif
   */
  ICP.prototype.hideLoader = function() {
    $("#CuratedContentToolModal header img").hide();
  };

  /**
   * Inserts an article type selection table into modal
   *
   * @example
   * articleTypes = [
   *  {name: "Character infobox", class: "character", label: "Character"},
   *  {name: "Event infobox", class: "conflict", label: "Event"}
   * ]
   * options = {
   *  numColumns: 3,
   *  hasOther: false
   * }
   * insertArticleTypeTable(articleTypes, options);
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
    parentDiv.id = "ICPNewArticleGrid";
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

    $("#ICPNewArticleGrid>div").one("click", function() {
      dfd.resolve($(this).attr("data-tipo"));
    });
    return dfd.promise();
  };

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
  };

  //Wrapping up
  ICP.prototype.finishEdit = function() {
    console.log(this.articleWikitext);
    var articleWikitext = this.articleWikitext.join("");
    articleWikitext += "\n\n"+"<!-- Artigo gerado pelo ICP -->";
    articleWikitext += "\n<!-- Gerado às "+new Date().toString()+"-->";
    this._currentStepExit();
    var instance = this;
    if (this.VESurface.mode == "visual") {
      //Visual Editor
      //TODO ensure that mw.libs.ve is avaliable beforehand
      this.updateModalBody("<p>Carregando suas edições...</p>");
      mw.libs.ve.targetLoader.requestParsoidData(this.articleTitle, {wikitext: articleWikitext}).then(function(data) {
        try {
          instance.VESurface.getView().focus();
          var wikiDocument = new DOMParser().parseFromString(data.visualeditor.content, "text/html");
          var VEDocument = ve.dm.converter.getModelFromDom(wikiDocument);
          instance.VESurface.getModel().getFragment().insertDocument(VEDocument);
          instance._finish();
        } catch (e) {
          instance.userActions.errors.push(e.toString());
          instance._handleFinishEditError(articleWikitext);
        }
      }).fail(function() {
        instance._handleFinishEditError(articleWikitext, true);
      });
    } else {
      //Source editor and WYSIWYG editor
      this._finish();
      this.VESurface.getView().focus();
      this.VESurface.getModel().getFragment().insertContent(articleWikitext);
    }
  };

  ICP.prototype._finish = function() {
    $("#blackout_CuratedContentToolModal").remove();
    if (this.sendFeedbackEnabled) this.sendFeedback();
    if (this.wysiwyg === true) this.changeSourceToWys();
  };

  ICP.prototype._handleFinishEditError = function(articleWikitext, retryable) {
    var instance = this;
    var container = document.createElement("div");
    var paragraph = document.createElement("p");
    paragraph.innerText = "Houve um erro na inserção automática de suas contribuições no Editor Visual. ";
    paragraph.innerText += "Para completar sua edição, copie o wikitexto a seguir e insira-no no modo fonte:";
    container.appendChild(paragraph);

    var textarea = document.createElement("textarea");
    textarea.readOnly = true;
    textarea.style.width = "100%";
    textarea.style.height = "500px";
    textarea.value = articleWikitext;
    container.appendChild(textarea);

    this.updateModalBody(container);
    this.appendButtonToModalBody("OK").then(function() {
      instance._finish();
    });
    if (retryable) {
      this.appendButtonToModalBody("Tentar novamente").then(function() {
        instance.finishEdit();
      });
    }
  }

  ICP.prototype.encodeURL = function(txt) {
    return encodeURI(txt.replace(/ /g, "_"));
  };

  ICP.prototype._collectInitialMetrics = function() {
    this.userActions.user = (mw.config.get("wgUserId") || false);
    this.userActions.page = mw.config.get("wgPageName");
    this.userActions.editor = (mw.config.get("wgAction") == 'edit') ? "source" : "VE";
    this.userActions.date = new Date();
    this.userActions.whereFrom = document.location.href; //So that I know if they're coming from redlinks, Special:CreatePage or other flows
    this.userActions.version = [ICPversion, this.version];
    this.userActions.errors = [];
    this.userActions.stepsExecuted = [];
  };

  ICP.prototype._getICPSettings = function() {
    var defaultSettings = {default_action: 1};
    var settingsRaw = (mw.storage && mw.storage.get("ICPsettings")) || JSON.stringify(defaultSettings);
    var settings = JSON.parse(settingsRaw);
    this.userActions.ICPconfig = settingsRaw;
    return settings;
  };

  ICP.prototype.shouldOpenICP = function() {
    return ((this.isNewArticle() && this.isMainNamespace()) || this.isSpecialCreatePage());
  };

  ICP.prototype.setArticleTitle = function(articleTitle) {
    this.articleTitle = articleTitle;
  };

  ICP.prototype.sendFeedback = function() {
    return null;
  };

  ICP.prototype.init = function() {
    var instance = this;
    console.info('ICP init v'+this.version+' with base v'+ICPversion);
    mw.loader.using('mediawiki.api', function() {
      console.debug('ICP: mediawiki.api loaded');
      instance.mwApi = new mw.Api();
    });
    mw.hook("ve.activationComplete").add(function() {
      instance.VESurface = window.ve.init.target.getSurface();
      instance.userActions.editor = instance.VESurface.mode;
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
    if (ICPsettings.default_action === 0) {
      $("#WikiaBarWrapper ul.tools").append('<li id="ICP_opener"><a href="#">Int. Criação Página</a></li>');
      $("#ICP_opener").click(function() {instance.controller() });
    } else {
      if (mw.config.get("wgAction") == 'edit')
        this.controller();
      if (mw.config.get("wgAction") == 'view')
        if (document.location.href.search("veaction=edit") >= 0)
          this.controller();
        else {
          $("#ca-ve-edit").click(function() {instance.controller() });
          $("#ca-edit").click(function() {instance.controller() });
        }
    }
  };

  /**
   * Extends ICP subclass with its variables and functions
   * 
   * @param {ICP} module ICP subclass
   * @exports extend
   */
  var extend = function(module) {
    module.prototype = $.extend({}, ICP.prototype, module.prototype);
    Object.defineProperty(module.prototype, 'constructor', {
      value: module,
      enumerable: false,
      writable: true
    });
  };

  var exports = {
    ICP: ICP,
    ModalInfobox: ModalInfobox,
    StepWikitext: StepWikitext,
    extend: extend
  };

  $(document).ready(function() {
    mw.loader.using(['oojs-ui-core', 'oojs-ui-windows']).done(function() {
      mw.hook("dev.icp").fire(exports);
    })
  });
  
  return exports;
})(jQuery);
