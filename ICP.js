/* ************************************************************************
************************* Page Creation Interface *************************
* Page Creation Interface (ICP) is a helping tool developed by Thales César for creating new articles in Star Wars Wiki em Português. It consists on a modal window that simplifies the article-creation process into a step-by-step procedure. Through this feature, editors can insert default navigation templates, infobox and categories, all in acord to our internal guidelines. NOTE: I have discussed this tool with FANDOM Staff, and I've got their approval.
* GitHub repository: https://github.com/brosquinha/ICP
*/
//TODO: refatorar: dividir parte lógica da UI e melhorar tratamento de erros
var SWWICP = (function($) {
	"use strict";
	var ICPversion = '2.7.0-beta.1';
	var artigoNome, artigoTitulo;
	var artigoTexto = '';
	var artigoTipo = '';
	var ICP_wys = false;
	var deltaTime;
	var userActions = {}
	var foraDeUniverso;
	var ehNamespaceCanon;
	
	//In case there's an unexpected error, send details to server for analysis
	var errorHandler = function(funcao) {
		try {
			funcao();
		}
		catch(e) {
			console.log(e.toString());
			var erroTxt = e.name + ": " + e.message
			erroTxt += (typeof e.stack === "undefined") ? '' : ' - ' + e.stack;
			userActions.errors.push(erroTxt);
			userActions.userAgent = window.navigator.userAgent;
			alert("Ocorreu um erro. Um relatório sobre esse inconveniente está sendo enviado para os administradores. Sua edição até aqui será salva.");
			finalizarEdicao();
		}
	}
	
	//Step0: article type selection
	var inserirBotaoNovaPagina = function() {
		if (document.getElementById("blackout_CuratedContentToolModal") != "null")
			$("#blackout_CuratedContentToolModal").remove();
		var passo0 = '<p style="margin-top:0" id="NovaPaginaIntroParagraph">Selecione um tipo de artigo:</p>'
		+'<table style="width:100%;border-spacing:3px;text-align:center;" id="NovaPaginaTipoDeArtigo">'
			+'<tr><td style="width:50%" data-tipo="Personagem infobox"><div class="infoboxIcon personagem"></div>Personagem</td>'
			+'<td data-tipo="Planeta"><div class="infoboxIcon planeta"></div>Planeta</td></tr>'
			+'<tr><td style="width:50%" data-tipo="Droide infobox"><div class="infoboxIcon droide"></div>Droide</td>'
			+'<td data-tipo="Nave"><div class="infoboxIcon nave"></div>Espaçonave</td></tr>'
			+'<tr><td style="width:50%" data-tipo="Evento"><div class="infoboxIcon evento"></div>Evento</td>'
			+'<td data-tipo="Dispositivo infobox"><div class="infoboxIcon tecnologia"></div>Tecnologia</td></tr>'
			+'<tr><td colspan="2" data-tipo="outro">Outro tipo de artigo</td></tr>'
		+'</table>';
		$(document.head).append('<link rel="stylesheet" href="http://slot1.images3.wikia.nocookie.net/__am/1480421167/sass/background-dynamic%3Dtrue%26background-image%3Dhttp%253A%252F%252Fimg3.wikia.nocookie.net%252F__cb20150811224031%252Fpt.starwars%252Fimages%252F5%252F50%252FWiki-background%26background-image-height%3D1080%26background-image-width%3D1920%26color-body%3D%2523000000%26color-body-middle%3D%2523000000%26color-buttons%3D%2523006cb0%26color-header%3D%25233a5766%26color-links%3D%2523006cb0%26color-page%3D%2523ffffff%26oasisTypography%3D1%26page-opacity%3D100%26widthType%3D0/resources/wikia/ui_components/modal/css/modal_default.scss" />');
		$('body').append('<div id="blackout_CuratedContentToolModal" class="modal-blackout visible" style="z-index:"5000105>'
			+'<div id="CuratedContentToolModal" class="modal medium no-scroll curated-content-tool-modal ">'
				+'<header>'
					+'<span class="close">Close</span>'
						+'<h3>Criando um novo artigo</h3>'
				+'</header>'
				+'<section>'+passo0+'</section>'
				+'<footer>'
					+'<button id="configuracoesICP" class="secondary">Configurações</button>'
					+'<div style="float:right;">'
						//+'<button id="finalizarEdicao">Terminar</button>' //class="buttons"
					+'</div>'
				+'</footer>'
			+'</div>'
		+'</div>');
		deltaTime = new Date().getTime();
		if (userActions.user === false && document.location.href.search("redlink=1") >= 0)
		{
			//Many anons get here accidentally, so let's confirm they really intend to create a new article
			var passo0Anon = '<span id="passo0Anon"><p>Você seguiu para uma página que não existe. Para criá-la, clique em "Continuar". '+
			'Para voltar a navegar na <i>Star Wars Wiki</i> em Português, clique em "Voltar".</p>'+
			'<div style="width:80%;margin:0px auto;"><button class="secondary" onclick="window.history.back();">Voltar</button>'+
			'<button id="anonContinuar" style="float:right">Continuar</button></div></span>';
			$("#configuracoesICP").hide();
			$("#NovaPaginaIntroParagraph").hide();
			$("#NovaPaginaTipoDeArtigo").hide();
			$("#CuratedContentToolModal").css('width', '500px');
			$("#CuratedContentToolModal section").append(passo0Anon);
			$("#anonContinuar").click(function() { errorHandler(function() {
				$("#CuratedContentToolModal").css('width', '');
				$("#configuracoesICP").show();
				$("#NovaPaginaIntroParagraph").show();
				$("#NovaPaginaTipoDeArtigo").show();
				$("#passo0Anon").remove();
			})});
		}
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
			'<p><a href="http://pt.starwars.wikia.com/wiki/Utilizador:Thales_C%C3%A9sar/ICP" target="_blank">Sobre a ICP</a></p>';
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
				},				{
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
			finalizarEdicao();
		});
		$("#NovaPaginaTipoDeArtigo td").one("click", function() { artigoTipo = $(this).attr("data-tipo"); errorHandler(function() {
			console.log("Carregando modelo para "+artigoTipo);
			deltaTime = (new Date().getTime()) - deltaTime;
			userActions.passo0DT = deltaTime;
			if (localStorage.ICPsettings)
				userActions.ICPconfig = localStorage.ICPsettings;
			else
				userActions.ICPconfig = false;
			userActions.infoboxType = artigoTipo;
			foraDeUniverso = false; //false means it's an in-universe article
			var infoboxName, infoboxUrl;
			if (artigoTipo == 'outro')
			{
				var selecionarInfoboxCustom = "<p>Selecione uma infobox para seu artigo</p>"+
				'<select id="selecionarInfoboxCustom"><option value>Escolher infobox</option></select>'+
				'<button data-resp="s">Pronto</button>';
				$("#CuratedContentToolModal section").html(selecionarInfoboxCustom);
				//Tratar erro
				$.get("http://pt.starwars.wikia.com/wiki/Ajuda:Predefini%C3%A7%C3%B5es/Infobox?action=raw", function(data) { errorHandler(function() {
					var infoboxes = data.split("\n{{")
					for (var i=1; i<infoboxes.length; i++)
					{
						$("#selecionarInfoboxCustom").append('<option value="'+infoboxes[i].split("/preload")[0]+'">'+infoboxes[i].split("/preload")[0]+'</option>');
					}
					var chooseInfoboxTypeController = false;
					$("#CuratedContentToolModal section button[data-resp='s']").click(function() { errorHandler(function() {
						infoboxName = $("#selecionarInfoboxCustom").val();
						if (infoboxName == '' || chooseInfoboxTypeController ==  true)
							return;
						chooseInfoboxTypeController = true;
						userActions.infoboxType = infoboxName;
						infoboxUrl = encodarURL(infoboxName);
						if (infoboxName == "Batalha" || infoboxName == "Guerra")
						{
							//Batalha and Guerra infoboxes are special
							var numParticipantes = '';
							while (numParticipantes != '4' && numParticipantes != '3' && numParticipantes != '2')
								numParticipantes = prompt("Quantos participantes? (2, 3 ou 4)")
							infoboxUrl = (infoboxName == "Batalha") ? "Battle" : "War";
							if (numParticipantes == '2')
								infoboxUrl += '300';
							else if (numParticipantes == '3')
								infoboxUrl += '350';
							else
								infoboxUrl += '400';
						}
						console.log('Obtendo "'+infoboxName+'"');
						$.get("http://pt.starwars.wikia.com/api.php?action=query&prop=categories&titles=Predefinição:"+infoboxUrl+"&format=xml", function(data) { errorHandler(function() {
							//Figuring out whether this is an in-universe or out-of-universe article based on infobox category
							var categoryName = $($(data).find("cl")[0]).attr('title');
							console.log(categoryName);
							if (typeof(categoryName) != "undefined")
								if (categoryName == "Categoria:Infoboxes de mídia")
									foraDeUniverso = 1; //1 means out-of-universe article that needs Step1
								if (categoryName == "Categoria:Infoboxes fora do universo")
									foraDeUniverso = 2; //2 means out-of-universe article that does not need Step1
							inserirEras(infoboxName, infoboxUrl);
						})});
					})});
				})});
			}
			else
			{
				infoboxName = artigoTipo;
				infoboxUrl = encodarURL(infoboxName);
				inserirEras(infoboxName, infoboxUrl);
			}
		})});
	}
	
	//Step1: Insert Eras template
	var inserirEras = function(infoboxName, infoboxUrl)
	{
		$("#CuratedContentToolModal header h3").text("Passo 1: Universo");
		var passo1, txtBotaoSim, txtBotaoNao;
		if (foraDeUniverso)
		{
			//Out-of-universe article, defining Eras questions properly
			if (foraDeUniverso == 2)
			{
				//foraDeUniverso = 2 means we already know everything we need for Eras
				artigoTexto = "{{Eras|real}}\n";
				userActions.passo1DT = 0;
				$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:"+infoboxUrl+"?action=raw", function(data) { //Tratar erro
					errorHandler(function () { infoboxParser(data, infoboxName); });
				});
			}
			else
			{
				passo1 = '<p style="font-size:14px">Esse é um artigo fora-de-universo sobre uma mídia. A que universo pertence sua história?</p>';
				passo1 += '<p><button data-resp="canon"><img src="http://vignette2.wikia.nocookie.net/pt.starwars/images/0/07/Eras-canon-transp.png" style="height:19px" alt="Cânon" /></button>'+
				'<button data-resp="legends"><img src="http://vignette2.wikia.nocookie.net/pt.starwars/images/8/8d/Eras-legends.png" style="height:19px" alt="Legends" /></button>'+
				'<button data-resp="none" style="vertical-align: top">Nenhum</button></p>';
				$("#CuratedContentToolModal section").html(passo1);
				deltaTime = new Date().getTime();
				$("#CuratedContentToolModal section button[data-resp]").one("click", function() { var esse = this; errorHandler(function() {
					artigoTexto = "{{Eras|"+($(esse).attr('data-resp') == "none" ? "real" : $(esse).attr('data-resp') + "|real")+"}}\n";
					userActions.passo1DT = (new Date().getTime() - deltaTime);
					userActions.erasAnswer = $(esse).attr('data-resp');
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:"+infoboxUrl+"?action=raw", function(data) { //Tratar erro
						errorHandler(function () { infoboxParser(data, infoboxName); });
					});
				})});
			}
		}
		else
		{
			//In-universe article
			passo1 = '<img src="';
			passo1 += (ehNamespaceCanon) ? "http://vignette2.wikia.nocookie.net/pt.starwars/images/8/8d/Eras-legends.png" : "http://vignette2.wikia.nocookie.net/pt.starwars/images/0/07/Eras-canon-transp.png";
			passo1 += '" style="width:150px;float:right;" />';
			passo1 += '<p style="font-size:14px">Esse artigo existe no universo <span style="font-weight:bold">';
			if (ehNamespaceCanon)
			{
				passo1 += 'Cânon';
				txtBotaoSim = 'Sim, também existe no <i>Legends</i>';
				txtBotaoNao = 'Não, existe somente no Cânon';
				artigoTexto = "{{Eras|canon";
			}
			else
			{
				passo1 += '<i>Legends</i>';
				txtBotaoSim = 'Sim, também existe no Cânon';
				txtBotaoNao = 'Não, existe somente no <i>Legends</i>';
				artigoTexto = "{{Eras|legends";
			}
			passo1 += '</span>. Ele existe também no outro universo?</p>';
			passo1 += '<p><button data-resp="s">'+txtBotaoSim+'</button><button data-resp="n">'+txtBotaoNao+'</button>';
			$("#CuratedContentToolModal section").html(passo1);
			deltaTime = new Date().getTime();
			$("#CuratedContentToolModal section button[data-resp]").one("click", function() { var esse = this; errorHandler(function() {
				if ($(esse).attr('data-resp') == "s")
					artigoTexto += (ehNamespaceCanon) ? "|legends}}\n" : "|canon}}\n";
				else
					artigoTexto += "}}\n";
				console.log("Obtendo infobox...");
				userActions.passo1DT = (new Date().getTime() - deltaTime);
				userActions.erasAnswer = ($(esse).attr('data-resp') == "s");
				$("#CuratedContentToolModal section button[data-resp]").removeAttr("data-resp").attr('disabled');
				$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:"+infoboxUrl+"?action=raw", function(data) { //Tratar erro
					errorHandler(function () { infoboxParser(data, infoboxName); });
				});
			})});
		}
	}
	
	//Step2: Filling in infobox
	var infoboxParser = function (txt, nome)
	{
		var infoboxContent = txt.split("</infobox>")[0] + "</infobox>"; //Tratar erro
		userActions.editor = (window.wgAction == 'edit') ? "source" : "VE";
		if (window.wgAction == 'edit' && $("#cke_21_label").length == 1)
		{
			$("#cke_21_label").click(); //For WYSIWYG editor
			ICP_wys = true;
			userActions.editor = "WYSIWYG";
		}
		var infoboxObj = $.parseXML(infoboxContent); //Tratar erro
		$("#CuratedContentToolModal header h3").text("Passo 2: Infobox");
		var titleTagParam = $($(infoboxObj).find("title")[0]).attr('source');
		var passo2 = '<div style="position:relative"><div style="position:fixed;"><p>Preencha a infobox para o artigo</p>'+
		'<p>Ferramentas:</p><div class="ICPbuttons"><div id="linkButton"></div><div id="refButton"></div></div>'+
		'<br /><button>Pronto</button></div>';
		passo2 += '<aside class="portable-infobox pi-background pi-theme-Media pi-layout-default">'+
		'<h2 class="pi-item pi-item-spacing pi-title">'+artigoTitulo+'</h2>';
		artigoTexto += "{{"+nome+"\n";
		artigoTexto += "|nome-"+artigoTitulo+"\n";
		artigoTexto += "|imagem-\n";
		if (nome == "Personagem infobox")
		{
			//Personagem infobox has a special "type" parameter
			var personagemTypes = txt.split("\n*");
			personagemTypes[personagemTypes.length-1] = personagemTypes[personagemTypes.length-1].split("\n")[0];
			passo2 += '<div class="pi-item pi-data pi-item-spacing pi-border-color">'+
			'<h3 class="pi-data-label pi-secondary-font">Tipo de personagem</h3>'+
			'<div class="pi-data-value pi-font"><select id="personagemTypes">';
			for (var i=1; i<personagemTypes.length; i++)
			{
				passo2 += '<option value="'+personagemTypes[i]+'">'+personagemTypes[i]+'</option>';
			}
			passo2 += "</select></div></div>";
			artigoTexto += "|type-\n";
		}
		for (var i=0; i<$(infoboxObj).find("data").length; i++)
		{
			var dataTag, labelTagText;
			dataTag = $(infoboxObj).find("data")[i];
			if (typeof $(dataTag).children()[0] === "undefined")
				labelTagText = $(dataTag).attr('source');
			else
				labelTagText = $(dataTag).children()[0].innerHTML;
			passo2 += '<div class="pi-item pi-data pi-item-spacing pi-border-color">'+
			'<h3 class="pi-data-label pi-secondary-font">'+labelTagText+'</h3>'+
			'<div class="pi-data-value pi-font"><textarea placeholder="Preencher"></textarea></div></div>';
			artigoTexto += "|"+($(dataTag).attr('source'))+"=\n";
		}
		artigoTexto += "}}\n";
		passo2 += '</aside>';
		$("#CuratedContentToolModal section").html(passo2);
		$("aside textarea").first().focus();
		$("aside textarea").first().blur();
		setTimeout(function () {$("aside textarea").first().focus(); }, 50); //Simple trick to force focus on the first textarea
		deltaTime = new Date().getTime();
		$("#CuratedContentToolModal section").css('overflow-y', 'auto');
		userActions.usageOfNewButtons = 0;
		if (typeof mw.toolbar === "undefined") //For VE
			importScriptURI("https://slot1-images.wikia.nocookie.net/__load/-/debug%3Dfalse%26lang%3Dpt-br%26skin%3Doasis%26version%3D1508417393-20171019T123000Z/jquery.textSelection%7Cmediawiki.action.edit");
		if (ehNamespaceCanon)
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
		$("#CuratedContentToolModal section button").one("click", function() { errorHandler(function() {
			userActions.passo2DT = (new Date().getTime()) - deltaTime;
			var infTxts = $("#CuratedContentToolModal section aside textarea");
			var subArtTxt = artigoTexto.split("=");
			artigoTexto = subArtTxt[0].replace("|nome-", "|"+titleTagParam+" = ").replace("|imagem-", "|imagem = ").replace("|type-", "|type = "+$("#personagemTypes").val());
			for (var i=0; i<infTxts.length; i++)
			{
				artigoTexto += ' = '+$(infTxts[i]).val();
				artigoTexto += subArtTxt[i+1];
			}
			if (foraDeUniverso)
				artigoTexto += "'''"+artigoTitulo+"''' é um...";
			else
				artigoTexto += "'''"+artigoTitulo+"''' foi um...";
			console.log(artigoTexto);
			inserirInterlink();
		})});
	}
	
	//Step3: Insert interlang links
	var inserirInterlink = function ()
	{
		$("#CuratedContentToolModal header h3").text("Passo 3: Fontes e Aparições");
		var passo3 = "<p>Por favor, insira o nome da página correspondente em inglês (nome da página na Wookieepedia):";
		passo3 += "<textarea id='wookieePage' name='wookieePage' >"
		+((artigoTipo == "Personagem infobox" || artigoTipo == "Planeta" || artigoTipo == "Droide infobox") ? artigoNome.replace(/_/g, " ") : '')
		+"</textarea><button data-interlink='true'>Enviar</button>"
		+"<button data-prev='true'>Visualizar</button><button data-nope='true'>Não sei / não existe</button></p>";
		$("#CuratedContentToolModal section").html(passo3);
		deltaTime = new Date().getTime();
		$("#CuratedContentToolModal section button[data-interlink]").click(function() {
			if ($("#wookieePage").val() == '')
				return;
			userActions.passo3DT = (new Date().getTime()) - deltaTime;
			$("#CuratedContentToolModal section button").attr('disabled', '');
			userActions.interlink = $("#wookieePage").val();
			$.ajax({url:"http://www.99luca11.com/sww_helper?qm="+encodarURL($("#wookieePage").val()), jsonp: "jsonpCallback", dataType: "JSONP"}); //Tratar erro
		});
		$("#CuratedContentToolModal section button[data-prev]").click(function() {
			window.open("http://starwars.wikia.com/wiki/"+encodarURL($("#wookieePage").val()))
		});
		$("#CuratedContentToolModal section button[data-nope]").click(function() {
			userActions.interlink = false;
			userActions.passo3DT = (new Date().getTime()) - deltaTime;
			errorHandler(categorizar);
		});
	}
	
	//Because JSONP requires a global function, SWWICP returns a function to "recover" the flow
	window.jsonpCallback = function(data)
	{
		SWWICP.jsonpReturn(data);
	}
	
	//Gets and translates Wookiee's reference sections
	var wookieeData = function (data)
	{
		var wookiee = {};
		wookiee.page = data.content;
		if (wookiee.page === false)
		{
			alert("Página não encontrada!");
			$("#CuratedContentToolModal section button").removeAttr('disabled');
			return;
		}
		if (wookiee.page.toLowerCase().substring(0, 9) == "#redirect")
		{
			$("#wookieePage").val(wookiee.page.split("[[")[1].split("]]")[0]);
			$("#CuratedContentToolModal section button[data-interlink]").click();
			return;
		}
		wookiee.page.replace("{{interlang", "{{Interlang");
		wookiee.secoes = wookiee.page.split("==");
		console.log(wookiee.secoes);
		wookiee.aparicoes = '';
		wookiee.fontes = '';
		wookiee.bibliografia = '';
		wookiee.cast = '';
		for (i=0; i<wookiee.secoes.length; i++)
		{
			if ($.trim(wookiee.secoes[i]) == "Appearances")
			{
				wookiee.aparicoes = wookiee.secoes[i+1];
				//TODO: Verficar por aparições não canônicas
			}
			else if ($.trim(wookiee.secoes[i]) == "Sources")
			{
				wookiee.fontes = wookiee.secoes[i+1];
				break;
			}
			else if ($.trim(wookiee.secoes[i]) == "Bibliography")
			{
				wookiee.bibliografia = wookiee.secoes[i+1];
			}
			else if ($.trim(wookiee.secoes[i]) == "Cast")
			{
				wookiee.cast = wookiee.secoes[i+1];
			}
		}
		artigoTexto += "\n\n";
		var addDisclaimer = (wookiee.aparicoes || wookiee.bibliografia || wookiee.cast || wookiee.fontes) ? ["{{ICPDisclaimer}}", "|icp=1"] : ["", ''];
		var successionBoxText;
		if (wookiee.aparicoes.search(/\{\{Start(_| )box\}\}/) >= 0)
			successionBoxText = "aparicoes";
		else if (wookiee.fontes.search(/\{\{Start(_| )box\}\}/) >= 0)
			successionBoxText = "fontes";
		else
			successionBoxText = false;
		if (wookiee.fontes.search("{{Interlang") >= 0)
			wookiee.fontes = wookiee.fontes.split("{{Interlang")[0]; //Tratar erro
		if (wookiee.page.search("{{Interlang") >= 0)
		{
			var wookieeInterlang = addDisclaimer[0]+"{{Interlang\n|en="+$("#wookieePage").val()+wookiee.page.split("{{Interlang")[1].split("}}")[0]+addDisclaimer[1]+"}}"; //Tratar erro
			//Adding HotCat data
			var hotcatInterlinks = wookiee.page.split("{{Interlang")[1].split("}}")[0].split("|");
			for (i=0; i<hotcatInterlinks.length; i++)
				hotcatInterlinks[i] = hotcatInterlinks[i].replace("=", ":").replace(/\n/g, ''); //Yep, only the first "="
			console.log('pt:'+encodeURIComponent(artigoNome+hotcatInterlinks.join("|")));
			userActions.hotCatData = 'pt:'+encodeURIComponent(artigoNome+hotcatInterlinks.join("|"));
		}
		else
		{
			var wookieeInterlang = addDisclaimer[0]+"{{Interlang\n|en="+$("#wookieePage").val()+"\n"+addDisclaimer[1]+"\n}}";
			userActions.hotCatData = 'pt:'+encodeURIComponent(artigoNome);
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
		if (wookiee.cast != '' && foraDeUniverso == 1)
			artigoTexto += "== Elenco =="+wookiee.cast;
		if (wookiee.aparicoes != '' && foraDeUniverso == false)
			artigoTexto += "== Aparições =="+wookiee.aparicoes;
		if (wookiee.fontes != '')
			artigoTexto += "== Fontes =="+wookiee.fontes;
		if (wookiee.bibliografia != '' && foraDeUniverso)
			artigoTexto += "== Bibliografia =="+wookiee.bibliografia;
		artigoTexto += wookieeInterlang;
		//Tratar erro
		$.get("http://pt.starwars.wikia.com/wiki/Star_Wars_Wiki:Ap%C3%AAndice_de_Tradu%C3%A7%C3%A3o_de_obras/JSON?action=raw", function(data) { errorHandler(function() {
			var fixes = JSON.parse(data.replace("<pre>", '').replace("</pre>", ''));
			console.log("Apêndice de obras obtido.");
			for (var i=0; i<fixes.replacements.length; i++) {
				var txtRegEx = new RegExp(fixes.replacements[i][0], "g");
				artigoTexto = artigoTexto.replace(txtRegEx, fixes.replacements[i][1]);
			}
			categorizar();
		})});
	}
	
	//Step4: Categorize
	var categorizar = function ()
	{
		$("#CuratedContentToolModal header h3").text("Passo 4: Categorias");
		var passo4 = '<p>Para finalizar, categorize o artigo. Lembre-se de não ser reduntante: se categorizar '+
		'o artigo como "Mestre Jedi", por exemplo, NÃO o categorize como "Jedi".</p>';
		userActions.categorias = true;
		deltaTime = new Date().getTime();
		if (window.wgAction == 'edit')
		{
			$("#CuratedContentToolModal section").html(passo4);
			$("div [data-id='categories']").appendTo("#CuratedContentToolModal section");
			$("#CuratedContentToolModal section").append("<p><button>Terminei</button></p>");
			$("#CuratedContentToolModal section button").click(function () {
				$("div [data-id='categories']").insertAfter("div [data-id='insert']");
				userActions.passo4DT = (new Date().getTime()) - deltaTime;
				finalizarEdicao();
			});
		}
		else
		{
			//For VE, we'll simply redirect user to VE's categories interface
			passo4 += '<p>Para isso, clique em "Categorias" no Editor Visual conforme lhe é apresentado e preencha o campo '
			+'com as categorias. Quando terminar, clique no botão "Aplicar mudanças".</p>';
			$("#CuratedContentToolModal section").html(passo4);
			$("#CuratedContentToolModal section").append("<p><button>Ok, vamos lá</button></p>");
			$("#CuratedContentToolModal section button").click(function () {
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
						finalizarEdicao();
					});
				}, 1500);
			});
			$("div.oo-ui-layout.oo-ui-panelLayout.oo-ui-panelLayout-scrollable.oo-ui-panelLayout-expanded.oo-ui-pageLayout:nth-of-type(3)").appendTo("#CuratedContentToolModal section");
		}
	}
	
	//Wrapping up
	var finalizarEdicao = function ()
	{
		if ((artigoTexto.match(/\{\{Interlang/g) || []).length == 1)
			artigoTexto = artigoTexto.split("{{Interlang")[0] + "== Notas e referências ==\n{{Reflist}}\n\n" + "{{Interlang" + artigoTexto.split("{{Interlang")[1];
		else
			artigoTexto += "\n\n== Notas e referências ==\n{{Reflist}}";
		artigoTexto += "\n\n"+"<!-- Artigo gerado pelo ICP -->";
		if (window.wgAction == "view")
		{
			//Visual Editor
			var botaoParaClicar = $("span.oo-ui-tool-name-wikiaSourceMode span.oo-ui-tool-title").text();
			alert("Por favor, clique em \""+botaoParaClicar+"\" e aguarde alguns segundos.");
			$("#CuratedContentToolModal span.close").click();
			$($("div.oo-ui-toolbar-tools div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup")[0]).addClass('oo-ui-popupToolGroup-active oo-ui-popupToolGroup-left');
			$("span.oo-ui-tool-name-wikiaSourceMode").css('border', '1px solid');
			$("span.oo-ui-tool-name-wikiaSourceMode a").click(function() {
				var observarModal = new MutationObserver(function (mutacao, observ) {
					//console.log("Mudei");
					if ($("div.oo-ui-window-content.oo-ui-dialog-content.oo-ui-processDialog-content.ve-ui-wikiaSourceModeDialog-content").hasClass('oo-ui-window-content-ready'))
					{
						var textoAInserir = ($("textarea.ui-autocomplete-input").val().search("\\[\\[Categoria:") >= 0) ? artigoTexto+"\n\n"+$("textarea.ui-autocomplete-input").val() : artigoTexto;
						$("textarea.ui-autocomplete-input").val(textoAInserir);
						$("textarea.ui-autocomplete-input").change();
						var intervalo = setInterval(function() {
						//TODO: Testar tudo isso à exaustão
							if ($("textarea.ui-autocomplete-input").val() !== textoAInserir)
							{
								$("textarea.ui-autocomplete-input").val(textoAInserir);
								$("textarea.ui-autocomplete-input").change();
								observ.disconnect()
								clearInterval(intervalo);
								setTimeout(function() {
									$("div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-labelElement.oo-ui-flaggedElement-progressive.oo-ui-flaggedElement-primary.oo-ui-buttonWidget.oo-ui-actionWidget.oo-ui-buttonElement-framed a.oo-ui-buttonElement-button").click();
										var observarConteudo = new MutationObserver(function(mutacaoJanela, observJanela) {
										observJanela.disconnect();
										var observarBody = new MutationObserver(function(mutacaoBody, observBody) {
											//TODO: testar e terminar confirmação de inserção bem-sucedida do wikitexto
											console.log($("#title-eraicons").length == 1);
											userActions.autoInsertSuccess = ($("#title-eraicons").length == 1);
											if ($("#title-eraicons").length != 1)
											{
												$($("div.oo-ui-toolbar-tools div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup")[0]).addClass('oo-ui-popupToolGroup-active oo-ui-popupToolGroup-left');
												$("span.oo-ui-tool-name-wikiaSourceMode").css('border', '1px solid');
												var backupTextarea = '<p>Infelizmente não foi possível registrar automaticamente seu progresso e, portanto, você deve fazê-lo manualmente.'+
												' Por favor, copie o código abaixo e volte em '+botaoParaClicar+' e cole-o lá.</p>'+
												'<textarea id="backupTextarea" style="width:590px; height: 210px">'+textoAInserir+'</textarea>';
												$.showCustomModal('Ocorreu um problema', backupTextarea, {
													id: 'ModalBackupWindow',
													width: 600,
													height: 350
												});
												$("#backupTextarea").on("copy", function() {
													$("#ModalBackupWindow").closeModal();
												});
											}
											observBody.disconnect();
										});
										observarBody.observe(document.body, {childList: true});
									});
									observarConteudo.observe($("div.ve-ce-surface.mw-body-content").parent()[0], {childList: true});
								}, 1000);
							}
						}, 250);
					}
				});
				observarModal.observe($("div.oo-ui-window-content.oo-ui-dialog-content.oo-ui-processDialog-content.ve-ui-wikiaSourceModeDialog-content")[0], {attributes: true});
			});
		}
		else
		{
			//Source editor and WYSIWYG editor
			var theTextarea = ($('#cke_contents_wpTextbox1 textarea')[0] || $('#wpTextbox1')[0]);
			if (theTextarea.value.toLowerCase().search("\\[\\[file:placeholder") >= 0) //Because of Fandom's "standard layout" option
				theTextarea.value = artigoTexto;
			else
				theTextarea.value += artigoTexto;
			$("#CuratedContentToolModal span.close").click();
			if (ICP_wys == true)
				setTimeout(function() {$("#cke_22_label").click()}, 1500);
		}	
	}
	
	var sendFeedback = function() {
		//This is meant for collecting info about how people use this tool so that I can improve it a lot more. I am only sending people's hashID because I need to know whether the data is from different people or not. This is also used to collect info when errors occur
		$.ajax({
			url:"http://www.99luca11.com/sww_helper",
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
	
	//TODO: terminar função de corrigir mensagem do filtro de abuso
	//Replaces VE's useless error message for abuse filter with custom message per filter
	var corrigirMensagemFiltroAbuso = function() {
		if ($(".oo-ui-processDialog-error").text() != 'The modification you tried to make was aborted by an extension hook')
			return;
		$(".oo-ui-processDialog-error").text("Carregando detalhes do erro...");
		$.get("http://pt.starwars.wikia.com/api.php?action=query&list=abuselog&afluser="+encodarURL(window.wgUserName)+"&afltitle="+encodarURL(artigoNome)+"&aflprop=ids|user|title|action|result|timestamp|details&format=json", function (data) {
			console.log(data);
			var log = data; //JSON.parse(data);
			try {
				var abuseId = log.query.abuselog[0].filter_id;
			}
			catch(e) {
				var abuseId = false;
			}
			if (abuseId == 3)
			{
				$(".oo-ui-processDialog-error").html("O artigo que enviou carece de elementos básicos necessários a todos os artigos do site."+
				' Por favor, utilize a <a href="#" id="abuseFilterICPCaller">Interface de Criação de Páginas</a>.');
				$("#abuseFilterICPCaller").click(function() { errorHandler(inserirBotaoNovaPagina); });
			}
			else
				$(".oo-ui-processDialog-error").text("Sua edição não pôde ser salva. Tente novamente mais tarde.");
		});
	}
	
	var init = function() { //TODO: testar ICP para Special:CreatePage
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
					userActions.page = document.editform.wpTitle.value;
					artigoNome = document.editform.wpTitle.value;
					if (artigoNome.substr(0, 8) == "Legends:")
					{
						artigoTitulo = artigoNome.substr(8);
						ehNamespaceCanon = false;
					}
					else
					{
						artigoTitulo = artigoNome;
						ehNamespaceCanon = true;
					}
				})});
			}
			else
			{
				artigoNome = window.wgPageName;
				artigoTitulo = window.wgTitle;
				if (window.wgNamespaceNumber == 0)
					ehNamespaceCanon = true;
				else
					ehNamespaceCanon = false;
			}
			var opcoesICP = {}
			if (localStorage.ICPsettings)
				opcoesICP = JSON.parse(localStorage.ICPsettings);
			else
				opcoesICP.default_action = 1;
			if (opcoesICP.default_action == 0)
			{
				$("#WikiaBarWrapper ul.tools").append('<li id="ICP_opener"><a href="#">Int. Criação Página</a></li>');
				$("#ICP_opener").click(function() { errorHandler(inserirBotaoNovaPagina); });
			}
			else
			{
				if (window.wgAction == 'edit')
					errorHandler(inserirBotaoNovaPagina);
				if (window.wgAction == 'view')
					if (document.location.href.search("veaction=edit") >= 0)
						errorHandler(inserirBotaoNovaPagina);
					else
						$("#ca-ve-edit").click(function () { errorHandler(inserirBotaoNovaPagina); });
			}
		}
	 
	}
	
	$(document).ready(init);
	return {
		jsonpReturn: function(txt) { errorHandler(function () { wookieeData(txt); }); },
		isAlt: false //Key control
	}
})(jQuery);