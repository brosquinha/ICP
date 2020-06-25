/* ************************************************************************
************************* Page Creation Interface *************************
* Page Creation Interface (ICP) is a helping tool developed by Thales César for creating new articles in Star Wars Wiki em Português. It consists on a modal window that simplifies the article-creation process into a step-by-step procedure. Through this feature, editors can insert default navigation templates, infobox and categories, all in acord to our internal guidelines. NOTE: I have discussed this tool with FANDOM Staff, and I've got their approval.
* GitHub repository: https://github.com/brosquinha/ICP
*/

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
    this.sendFeedbackEnabled = false;
    this.closeFeedbackEnabled = false;
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
  ICP.prototype.ajaxGet = function(url, successCallback, errorCallback=false) {
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
  ICP.prototype.apiGet = function(options, successCallback, errorCallback=false) {
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
  ICP.prototype.controller = function(steps, options={anon: true}) {
    this.buildModal();
    if (options.anon) steps.unshift(this.confirmAnon);
    steps.push(this.finishEdit);
    this._controller(steps);
  }

  ICP.prototype._controller = function(steps) {
    if (steps.length === 0) return;
    var instance = this;
    $.when(this.errorHandler(steps.shift()).apply(this)).then(function() {
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
    if (this.icp.articleWikitext[this.index] === undefined) this.icp.articleWikitext[this.index] = "";
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
        if (typeof(instance.userActions.passo0DT) != "undefined" && typeof(instance.userActions.passo4DT) == "undefined" && typeof(instance.userActions.errors[0]) == 'undefined')
          instance.userActions.closeFeedback = prompt("Por favor, nos ajude a deixar essa ferramenta ainda melhor. Diga-nos o motivo de estar abandonando o processo no meio.") || false;
      $("#blackout_CuratedContentToolModal").removeClass('visible');
      if (instance.sendFeedbackEnabled) instance.sendFeedback();
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
  ICP.prototype.appendButtonToModalBody = function(label, options={}) {
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
  var ModalInfobox = function(content, title, options={}) {
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
   * @param {HTMLElement|Boolean} [value] Infobox field value (defaults to textarea)
   */
  ModalInfobox.prototype.addInfoboxField = function(label, source, value=false) {
    var infoboxField = document.createElement("div");
    infoboxField.classList = "pi-item pi-data pi-item-spacing pi-border-color";
    var infoboxFieldLabel = document.createElement("h3");
    infoboxFieldLabel.classList = "pi-data-label pi-secondary-font";
    infoboxFieldLabel.textContent = label;
    var infoboxFieldValue = document.createElement("div");
    infoboxFieldValue.classList = "pi-data-value pi-font";
    if (value) {
      infoboxFieldValue.appendChild(value);
    } else {
      var textarea = document.createElement("textarea");
      textarea.placeholder = "Preencher";
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
   * @param {Object} selectOptions Select options
   * @param {String} selectOptions.id Select id
   * @param {Function} selectOptions.callback Select callback for change event
   * @param {Object[]} selectOptions.options Select options for select's options
   * @param {String} selectOptions.options[].value Select element value
   * @param {String} selectOptions.options[].label Select element label
   */
  ModalInfobox.prototype.addInfoboxFieldSelect = function(label, selectOptions) {
    var select = document.createElement("select");
    if (selectOptions.id) select.id = selectOptions.id;
    selectOptions.options.forEach(function(option) {
      var optionElem = document.createElement("option");
      optionElem.value = option.value;
      optionElem.textContent = option.label;
      select.appendChild(optionElem);
    });
    if (selectOptions.callback) $(select).change(selectOptions.callback);
    this.addInfoboxField(label, '', select);
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
  ICP.prototype.resizeModal = function(size="") {
    $("#CuratedContentToolModal").css('width', size);
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
  ICP.prototype.insertArticleTypeTable = function(articleTypes, options = {}) {
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
        this.resizeModal();
        $("#configuracoesICP").show();
        dfd.resolve();
      });
    } else
      dfd.resolve();
    return dfd.promise();
    //TODO write Selenium test for this whole step (not currently covered)
  }

  //Wrapping up
  ICP.prototype.finishEdit = function() {
    console.log(this.articleWikitext);
    this.articleWikitext = this.articleWikitext.join("");
    this.articleWikitext += "\n\n"+"<!-- Artigo gerado pelo ICP -->";
    this.articleWikitext += "\n<!-- Gerado às "+new Date().toString()+"-->";
    var instance = this;
    if (window.wgAction == "view") {
      //Visual Editor
      var targetButtonText = $("span.oo-ui-tool-name-wikiaSourceMode span.oo-ui-tool-title").text();
      alert("Por favor, clique em \""+targetButtonText+"\" e aguarde alguns segundos.");
      $("#CuratedContentToolModal span.close").click();
      $($("div.oo-ui-toolbar-tools div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup")[0]).addClass('oo-ui-popupToolGroup-active oo-ui-popupToolGroup-left');
      $("span.oo-ui-tool-name-wikiaSourceMode").css('border', '1px solid');
      $("span.oo-ui-tool-name-wikiaSourceMode a").click(function() {
        setTimeout(function() {
          if ($("textarea.ui-autocomplete-input").val().search("\\[\\[Categoria:") >= 0)
            $("textarea.ui-autocomplete-input").val(instance.articleWikitext+"\n\n"+$("textarea.ui-autocomplete-input").val());
          else
            $("textarea.ui-autocomplete-input").val(instance.articleWikitext);
          $("textarea.ui-autocomplete-input").change();
          setTimeout(function() {$("div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-labelElement.oo-ui-flaggedElement-progressive.oo-ui-flaggedElement-primary.oo-ui-buttonWidget.oo-ui-actionWidget.oo-ui-buttonElement-framed a.oo-ui-buttonElement-button").click();}, 1000);
        }, 2000);
      });
    } else {
      //Source editor and WYSIWYG editor
      if (this.wysiwyg && $("[id=wpTextbox1]").length > 1) //For now, since there are two textareas with id=wpTextbox1
        $('#wpTextbox1').attr('id', 'wpTextbox0');
      var theTextarea = ($('#cke_contents_wpTextbox1 textarea')[0] || $('#wpTextbox1')[0]);
      if (theTextarea.value.toLowerCase().search("\\[\\[file:placeholder") >= 0) //Because of Fandom's "standard layout" option
        theTextarea.value = this.articleWikitext;
      else
        theTextarea.value += this.articleWikitext;
      $("#CuratedContentToolModal span.close").click();
      if (this.wysiwyg == true)
        setTimeout(function() {window.CKEDITOR.tools.callFunction(59)}, 1500);
    }
  }

  ICP.prototype.encodeURL = function(txt) {
    return encodeURI(txt.replace(/ /g, "_"))
  }

  ICP.prototype.changeWysToSource = function() {
    this.userActions.editor = (mw.config.get("wgAction") == 'edit') ? "source" : "VE";
    if (mw.config.get("wgAction") == 'edit' && $("#cke_21_label").length == 1)
    {
      window.CKEDITOR.tools.callFunction(56); //For WYSIWYG editor
      this.wysiwyg = true;
      this.userActions.editor = "WYSIWYG";
    }
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

  ICP.prototype.init = function() {
    var instance = this;
    console.info('ICP init v'+this.version+' with base v'+ICPversion);
    mw.loader.using('mediawiki.api', function() {
      console.debug('ICP: mediawiki.api loaded');
      instance.mwApi = new mw.Api();
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

var SWWICP = (function($) {
  "use strict";

  var ICPversion = '2.7.6-beta.4';
  var ICP;
  var ModalInfobox;
  var StepWikitext;

  var StarWarsWiki = function() {
    ICP.call(this);
    
    this.version = ICPversion;
    this.infoboxName;
    this.infoboxUrl;
    this.deltaTime;
    this.outOfUniverse;
    this.articleType = '';
    this.isCanonNamespace = false;
    this.infoboxesForTitle = ["Nave", "Filme", "Livro", "Livro de referência", "Quadrinhos", "Revista", "Série de quadrinhos", "Infobox TV", "Videogame"];
    this.sendFeedbackEnabled = true;
    this.closeFeedbackEnabled = true;
  }

  StarWarsWiki.prototype.getSteps = function() {
    return [
      this.articleTypeSelection,
      this.templateErasInsertion,
      this.infoboxInsertion,
      this.interwikiInsertion,
      this.categoriesInsertion
    ]
  }

  StarWarsWiki.prototype.shouldOpenICP = function() {
    this.isCanonNamespace = this.isMainNamespace();
    var isLegendsNamespace = mw.config.get("wgNamespaceNumber") == 114;
    return ((this.isNewArticle() && (isLegendsNamespace || this.isCanonNamespace)) || this.isSpecialCreatePage())
  }

  StarWarsWiki.prototype.setArticleTitle = function(articleTitle) {
    if (articleTitle.substr(0, 8) == "Legends:" && this.isSpecialCreatePage()) {
      this.articleTitle = articleTitle.substr(8);
      this.isCanonNamespace = false;
    } else {
      this.articleTitle = articleTitle;
      this.isCanonNamespace = true;
    }
  }

  StarWarsWiki.prototype.sendFeedback = function() {
    //This is meant for collecting info about how people use this tool so that I can improve it a lot more. I am only sending people's hashID because I need to know whether the data is from different people or not. This is also used to collect info when errors occur
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
    })
  }

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
      instance.deltaTime = (new Date().getTime()) - instance.deltaTime;
      instance.userActions.passo0DT = instance.deltaTime;
      instance.userActions.infoboxType = type;
      if (type == 'outro') {
        instance._otherInfoboxes().then(function() {
          dfd.resolve();
        })
      } else {
        instance.outOfUniverse = false; //false means it's an in-universe article
        instance.infoboxName = type;
        instance.infoboxUrl = instance.infoboxName;
        dfd.resolve();
      }
    }));
    this.deltaTime = new Date().getTime();
    return dfd.promise();
  }

  //Step0 helper: Select "Other"
  StarWarsWiki.prototype._otherInfoboxes = function() {
    var dfd = $.Deferred();
    var instance = this;
    var modalContent = "<p>Selecione uma infobox para seu artigo</p>"+
    '<select id="selecionarInfoboxCustom"><option value>Escolher infobox</option></select>';
    this.updateModalBody(modalContent);
    this.apiGetPageContents("Ajuda:Predefinições/Infobox").then(this.errorHandler(function(data) {
      var infoboxes = data.split("\n{{")
      for (var i=1; i<infoboxes.length; i++)
      {
        $("#selecionarInfoboxCustom").append('<option value="'+infoboxes[i].split("/preload")[0]+'">'+infoboxes[i].split("/preload")[0]+'</option>');
      }
      var chooseInfoboxTypeController = false;
      this.appendButtonToModalBody("Pronto").then(this.errorHandler(function(button) {
        instance.infoboxName = $("#selecionarInfoboxCustom").val();
        if (instance.infoboxName == '' || chooseInfoboxTypeController ==  true)
          return;
        chooseInfoboxTypeController = true;
        instance.userActions.infoboxType = instance.infoboxName;
        instance.infoboxUrl = instance.infoboxName;
        if (instance.infoboxName == "Batalha" || instance.infoboxName == "Guerra" || instance.infoboxName == "Missão")
        {
          //Batalha, Missão and Guerra infoboxes are special
          var numParticipants = '';
          while (numParticipants != '4' && numParticipants != '3' && numParticipants != '2')
            numParticipants = prompt("Quantos participantes? (2, 3 ou 4)")
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
              if (categoryName == "Categoria:Infoboxes fora do universo")
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
  }

  //Step1: Insert Eras template
  StarWarsWiki.prototype.templateErasInsertion = function() {
    var dfd = $.Deferred();
    var wikitext = new StepWikitext(this, 0);
    this.updateModalTitle("Passo 1: Universo");
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
        this.deltaTime = new Date().getTime();
        var canonButton = '<img src="https://vignette.wikia.nocookie.net/pt.starwars/images/0/07/Eras-canon-transp.png" style="height:19px" alt="Cânon" />';
        var legendsButton = '<img src="https://vignette.wikia.nocookie.net/pt.starwars/images/8/8d/Eras-legends.png" style="height:19px" alt="Legends" />';
        var solveEras = this.errorHandler(function(response) {
          wikitext.append("{{Eras|"+(response == "none" ? "real" : response + "|real")+"}}\n");
          instance.userActions.passo1DT = (new Date().getTime() - this.deltaTime);
          instance.userActions.erasAnswer = response;
          dfd.resolve();
        })
        this.appendButtonToModalBody(canonButton).then(function(button) {
          solveEras("canon");
        });
        this.appendButtonToModalBody(legendsButton).then(function(button) {
          solveEras("legends");
        })
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
      this.deltaTime = new Date().getTime();
      this.appendButtonToModalBody(txtButtonYes).then(this.errorHandler(function(button) {
        wikitext.append((instance.isCanonNamespace) ? "|legends}}\n" : "|canon}}\n");
        instance.userActions.passo1DT = (new Date().getTime() - instance.deltaTime);
        instance.userActions.erasAnswer = true;
        dfd.resolve();
      }));
      this.appendButtonToModalBody(txtButtonNo).then(this.errorHandler(function(button) {
        wikitext.append("}}\n");
        instance.userActions.passo1DT = (new Date().getTime() - instance.deltaTime);
        instance.userActions.erasAnswer = false;
        dfd.resolve();
      }));
    }
    this.changeWysToSource();
    return dfd.promise();
  }

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
  }

  StarWarsWiki.prototype._infoboxParser = function(templateContent, templateName) {
    var dfd = $.Deferred();
    var wikitext = new StepWikitext(this, 1);
    var infoboxObj = {};
    var infoboxWikitext = '';
    try {
      var infoboxContent = templateContent.split("</infobox>")[0] + "</infobox>";
      var infoboxDom = $.parseXML(infoboxContent);
    } catch (e) {
      dfd.reject(e.toString());
      return dfd.promise();
    }

    this.updateModalTitle("Passo 2: Infobox");
    var modalToolbox = '<p>Preencha a infobox para o artigo</p>'+
    '<p>Ferramentas:</p><div class="ICPbuttons"><div id="linkButton"></div><div id="refButton"></div></div>'+
    '<br /><button>Pronto</button></div>';
    var modalContent = new ModalInfobox(modalToolbox, this.articleTitle);
    modalContent.textareaValues.nome = '';
    modalContent.textareaValues.imagem = '';

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
      }
      var personagemTypes = templateContent.split("\n*");
      personagemTypes[personagemTypes.length-1] = personagemTypes[personagemTypes.length-1].split("\n")[0];
      for (var i=1; i<personagemTypes.length; i++)
      {
        selectOptions.options.push({value: personagemTypes[i], label: personagemTypes[i]})
      }
      modalContent.addInfoboxFieldSelect("Tipo de personagem", selectOptions);
      modalContent.textareaValues.type = '';
    }

    for (var i=0; i<$(infoboxDom).find("data").length; i++)
    {
      var dataTag, labelTagText, sourceText;
      dataTag = $(infoboxDom).find("data")[i];
      sourceText = $(dataTag).attr('source');
      if (typeof $(dataTag).children()[0] === "undefined")
        labelTagText = sourceText;
      else
        labelTagText = $(dataTag).children()[0].innerHTML;
      modalContent.addInfoboxField(labelTagText, sourceText);
    }
    this.updateModalBody(modalContent.getContent());

    $("aside textarea").first().focus();
    $("aside textarea").first().blur();
    setTimeout(function () {$("aside textarea").first().focus(); }, 50); //Simple trick to force focus on the first textarea
    this.deltaTime = new Date().getTime();
    $("#CuratedContentToolModal section").css('overflow-y', 'auto');
    this._infoboxButtonsCallbacks();

    var instance = this;
    $("#CuratedContentToolModal section button").one("click", this.errorHandler(function() {
      instance.userActions.passo2DT = (new Date().getTime()) - instance.deltaTime;
      infoboxObj = modalContent.getValues();
      if ("type" in infoboxObj) infoboxObj.type = $("#personagemTypes").val();
      infoboxObj.nome = instance.articleTitle;
      infoboxObj.imagem = '';
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
  }

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
    var instance = this;
    this.userActions.usageOfNewButtons = 0;
    if (typeof mw.toolbar === "undefined") //For VE
      importScriptURI("https://slot1-images.wikia.nocookie.net/__load/-/debug%3Dfalse%26lang%3Dpt-br%26skin%3Doasis%26version%3D1508417393-20171019T123000Z/jquery.textSelection%7Cmediawiki.action.edit");
    if (this.isCanonNamespace)
    {
      $("#linkButton").click(function() {
        mw.toolbar.insertTags("[[", "]]", "Exemplo", 0);
        instance.userActions.usageOfNewButtons += 1;
      });
    }
    else
    {
      $("#linkButton").click(function() {
        mw.toolbar.insertTags("{{"+"SUBST:L|", "}}", "Exemplo", 0);
        instance.userActions.usageOfNewButtons += 1;
      });
    }
    $("#refButton").click(function() {
      mw.toolbar.insertTags('<ref name="NOME">', "</ref>", "Exemplo", 0);
      instance.userActions.usageOfNewButtons += 1;
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
  }

  //Step3: Insert interlang links
  StarWarsWiki.prototype.interwikiInsertion = function() {
    var dfd = $.Deferred();
    this.updateModalTitle("Passo 3: Fontes e Aparições");
    var modalContent = "<p>Por favor, insira o nome da página correspondente em inglês (nome da página na Wookieepedia):";
    modalContent += "<textarea id='wookieePage' name='wookieePage' >"
    +((this.articleType == "Personagem infobox" || this.articleType == "Planeta" || this.articleType == "Droide infobox") ? this.articleName.replace(/_/g, " ") : '')
    +"</textarea>";
    this.updateModalBody(modalContent);
    this.deltaTime = new Date().getTime();
    var instance = this;
    this.appendButtonToModalBody("Enviar", {callback: this.errorHandler(function(button) {
      if ($("#wookieePage").val() == '')
        return;
      $(button).attr('disabled', '');
      instance.userActions.passo3DT = (new Date().getTime()) - this.deltaTime;
      instance.userActions.interlink = $("#wookieePage").val();
      instance._getWookieeData($("#wookieePage").val())
        .then(function() {
          dfd.resolve();
        })
        .fail(function() {
          $(button).removeAttr('disabled');
          //TODO testar várias tentativas de envio aqui
        });
    })});
    this.appendButtonToModalBody("Visualizar", {callback: this.errorHandler(function() {
      window.open("https://starwars.wikia.com/wiki/"+instance.encodeURL($("#wookieePage").val()))
    })});
    this.appendButtonToModalBody("Não sei / não existe").then(this.errorHandler(function() {
      var wikitext = new StepWikitext(instance, 2);
      instance.userActions.interlink = false;
      instance.userActions.passo3DT = (new Date().getTime()) - instance.deltaTime;
      wikitext.append("\n\n== Notas e referências ==\n{{Reflist}}\n");
      dfd.resolve();
    }));
    return dfd.promise();
  }

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
    }
    this.ajaxGet("https://www.99luca11.com/sww_helper?legacy=false&qm="+this.encodeURL(wookieePagename), success, error);
    // After migrating Wookiee and SWW to UCP, maybe we can replace this for https://www.mediawiki.org/wiki/Manual:CORS
    return dfd.promise();
  }

  //Gets and translates Wookiee's reference sections
  StarWarsWiki.prototype._translateWookiee = function (data) {
    var dfd = $.Deferred();
    var wikitext = new StepWikitext(this, 2);
    var wookieeWikitext = '';
    if (data == false) {
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

    if (wookiee.cast != '' && this.outOfUniverse == 1)
      wookieeWikitext += "== Elenco =="+wookiee.cast;
    if (wookiee.appearances != '' && this.outOfUniverse == false)
      wookieeWikitext += "== Aparições =="+wookiee.appearances;
    if (wookiee.sources != '')
      wookieeWikitext += "== Fontes =="+wookiee.sources;
    if (wookiee.bibliography != '' && this.outOfUniverse)
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
  }

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
  }

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
  }

  StarWarsWiki.prototype._addInterlang = function(wookiee) {
    if (wookiee.page.search("{{Interlang") >= 0) {
      //Adding HotCat data
      var hotcatInterlinks = wookiee.page.split("{{Interlang")[1].split("}}")[0].split("|");
      for (i=0; i<hotcatInterlinks.length; i++)
        hotcatInterlinks[i] = hotcatInterlinks[i].replace("=", ":").replace(/\n/g, ''); //Yep, only the first "="
      this.userActions.hotCatData = 'pt:'+encodeURIComponent(this.articleName+hotcatInterlinks.join("|"));
      return (wookiee.disclaimer[0]+"{{Interlang\n|en="+$("#wookieePage").val()+
        wookiee.page.split("{{Interlang")[1].split("}}")[0]+wookiee.disclaimer[1]+"}}"); //Tratar erro
    } else {
      this.userActions.hotCatData = 'pt:'+encodeURIComponent(this.articleName);
      return wookiee.disclaimer[0]+"{{Interlang\n|en="+$("#wookieePage").val()+"\n"+wookiee.disclaimer[1]+"\n}}";
    }
  }

  //Step3 helper: wookiee page validator
  StarWarsWiki.prototype._redirectPage = function(data) {
    $("#wookieePage").val(data.split("[[")[1].split("]]")[0]);
    return this._getWookieeData($("#wookieePage").val());
  }

  //Step4: Categorize
  StarWarsWiki.prototype.categoriesInsertion = function() {
    var dfd = $.Deferred();
    var instance = this;
    this.updateModalTitle("Passo 4: Categorias");
    var modalContent = '<p>Para finalizar, categorize o artigo. Lembre-se de não ser reduntante: se categorizar '+
    'o artigo como "Mestre Jedi", por exemplo, NÃO o categorize como "Jedi".</p>';
    this.userActions.categorias = true;
    this.deltaTime = new Date().getTime();
    if (window.wgAction == 'edit') {
      this.updateModalBody(modalContent);
      $("div [data-id='categories']").appendTo("#CuratedContentToolModal section");
      this.appendButtonToModalBody("Terminei").then(function(button) {
        $("div [data-id='categories']").insertAfter("div [data-id='insert']");
        instance.userActions.passo4DT = (new Date().getTime()) - this.deltaTime;
        dfd.resolve();
      });
    } else {
      //For VE, we'll simply redirect user to VE's categories interface
      modalContent += '<p>Para isso, clique em "Categorias" no Editor Visual conforme lhe é apresentado e preencha o campo '
      +'com as categorias. Quando terminar, clique no botão "Aplicar mudanças".</p>';
      this.updateModalBody(modalContent);
      this.appendButtonToModalBody("Ok, vamos lá").then(function(button) {
        $("#blackout_CuratedContentToolModal").removeClass('visible');
      });
      $($("div.oo-ui-toolbar-tools div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup")[0]).addClass('oo-ui-popupToolGroup-active oo-ui-popupToolGroup-left');
      $("span.oo-ui-tool-name-categories").css('border', '1px solid');
      $("span.oo-ui-tool-name-categories a").click(function() {
        setTimeout(function() {
          $("div.oo-ui-processDialog-actions-primary .oo-ui-buttonElement-button").click(function () {
            instance.userActions.passo4DT = (new Date().getTime()) - instance.deltaTime;
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
  }
})(jQuery);

