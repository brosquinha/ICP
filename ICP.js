/* ************************************************************************
************************* Page Creation Interface *************************
* Page Creation Interface (ICP) is a helping tool developed by Thales César for creating new articles in Star Wars Wiki em Português. It consists on a modal window that simplifies the article-creation process into a step-by-step procedure. Through this feature, editors can insert default navigation templates, infobox and categories, all in acord to our internal guidelines. NOTE: I have discussed this tool with FANDOM Staff, and I've got their approval.
*/
//TODO: refatorar: dividir parte lógica da UI e melhorar tratamento de erros
var SWWICP = (function($) {
	"use strict";
	var artigoTexto = '';
	var artigoTipo = '';
	var ICP_wys = false;
	var deltaTime;
	var userActions = {}
 
	var errorHandler = function(funcao) {
		try {
			funcao();
		}
		catch(e) {
			console.log(e.toString());
			var erroTxt = e.name + ": " + e.message
			erroTxt += (typeof e.stack === "undefined") ? '' : ' - ' + e.stack;
			userActions.errors.push(erroTxt);
			alert("Ocorreu um erro. Um relatório sobre esse inconveniente está sendo enviado para os administradores. Sua edição até aqui será salva.");
			finalizarEdicao();
		}
	}
	var inserirBotaoNovaPagina = function() {
		//<iframe data-url="/main/edit?useskin=wikiamobile" id="CuratedContentToolIframe" class="curated-content-tool" name="curated-content-tool" src="/main/edit?useskin=wikiamobile"></iframe>
		//if (window.wgAction == 'view' && artigoTexto != '') //Segunda chamada da Interface! Recarregar página!
		//	location.reload();
		if (document.getElementById("blackout_CuratedContentToolModal") != "null")
			$("#blackout_CuratedContentToolModal").remove();
		$(document.head).append('<link rel="stylesheet" href="http://slot1.images3.wikia.nocookie.net/__am/1480421167/sass/background-dynamic%3Dtrue%26background-image%3Dhttp%253A%252F%252Fimg3.wikia.nocookie.net%252F__cb20150811224031%252Fpt.starwars%252Fimages%252F5%252F50%252FWiki-background%26background-image-height%3D1080%26background-image-width%3D1920%26color-body%3D%2523000000%26color-body-middle%3D%2523000000%26color-buttons%3D%2523006cb0%26color-header%3D%25233a5766%26color-links%3D%2523006cb0%26color-page%3D%2523ffffff%26oasisTypography%3D1%26page-opacity%3D100%26widthType%3D0/resources/wikia/ui_components/modal/css/modal_default.scss" />');
		$('body').append('<div id="blackout_CuratedContentToolModal" class="modal-blackout visible" style="z-index:"5000105>'
			+'<div id="CuratedContentToolModal" class="modal medium no-scroll curated-content-tool-modal ">'
				+'<header>'
					+'<span class="close">Close</span>'
						+'<h3>Criando um novo artigo</h3>'
				+'</header>'
				+'<section>'
					+'<p style="margin-top:0">Selecione um tipo de artigo:</p>'
					+'<table style="width:100%;border-spacing:3px;text-align:center;" id="NovaPaginaTipoDeArtigo">'
						+'<tr><td style="width:50%" data-tipo="personagem"><div class="infoboxIcon"></div>Personagem</td>'
						+'<td data-tipo="planeta"><div class="infoboxIcon"></div>Planeta</td></tr>'
						+'<tr><td style="width:50%" data-tipo="droide"><div class="infoboxIcon"></div>Droide</td>'
						+'<td data-tipo="espaçonave"><div class="infoboxIcon"></div>Espaçonave</td></tr>'
						+'<tr><td style="width:50%" data-tipo="evento"><div class="infoboxIcon"></div>Evento</td>'
						+'<td data-tipo="tecnologia"><div class="infoboxIcon"></div>Tecnologia</td></tr>'
						+'<tr><td colspan="2" data-tipo="outro">Outro tipo de artigo</td></tr>'
					+'</table>'
				+'</section>'
				+'<footer>'
					+'<button id="configuracoesICP" class="secondary">Configurações</button>'
					+'<div style="float:right;">'
						//+'<button id="finalizarEdicao">Terminar</button>' //class="buttons"
					+'</div>'
				+'</footer>'
			+'</div>'
		+'</div>');
		deltaTime = new Date().getTime();
		$("#CuratedContentToolModal span.close").click(function() {
			if (typeof(userActions.passo0DT) != "undefined" && typeof(userActions.passo4DT) == "undefined")
				userActions.closeFeedback = prompt("Por favor, nos ajude a deixar essa ferramenta ainda melhor. Diga-nos o motivo de estar abandonando o processo no meio.") || false;
			$("#blackout_CuratedContentToolModal").removeClass('visible');
			sendFeedback();
		});
		$("#configuracoesICP").click(function () {
			var configModal = "<form name='config_form'><p><label>Abrir Interface de Criação de Páginas sempre que iniciar nova página."+
			"<input type='checkbox' name='default_action' checked /></label></p></form>"
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
			$("#CuratedContentToolModal header h3").text("Passo 1: Universo");
			var passo1, txtBotaoSim, txtBotaoNao;
			passo1 = '<img src="';
			passo1 += (window.wgNamespaceNumber == 0) ? "http://vignette2.wikia.nocookie.net/pt.starwars/images/8/8d/Eras-legends.png" : "http://vignette2.wikia.nocookie.net/pt.starwars/images/0/07/Eras-canon-transp.png";
			passo1 += '" style="width:150px;float:right;" />';
			passo1 += '<p style="font-size:14px">Esse artigo existe no universo <span style="font-weight:bold">';
			if (window.wgNamespaceNumber == 0)
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
					artigoTexto += (window.wgNamespaceNumber == 0) ? "|legends}}\n" : "|canon}}\n";
				else
					artigoTexto += "}}\n";
				console.log("Obtendo infobox...");
				userActions.passo1DT = (new Date().getTime() - deltaTime);
				userActions.erasAnswer = ($(esse).attr('data-resp') == "s");
				$("#CuratedContentToolModal section button[data-resp]").removeAttr("data-resp").attr('disabled');
				switch(artigoTipo) { //Tratar erro
					case "personagem":
						$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Personagem_infobox?action=raw", function(data) {
							errorHandler(function () { infoboxParser(data, "Personagem infobox"); });
						});
						break;
					case "planeta":
						$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Planeta?action=raw", function(data) {
							errorHandler(function () { infoboxParser(data, "Planeta"); });
						});
						break;
					case "droide":
						$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Droide_infobox?action=raw", function(data) {
							errorHandler(function () { infoboxParser(data, "Droide infobox"); });
						});
						break;
					case "espaçonave":
						$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Nave?action=raw", function(data) {
							errorHandler(function () { infoboxParser(data, "Nave"); });
						});
						break;
					case "evento":
						$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Evento?action=raw", function(data) {
							errorHandler(function () { infoboxParser(data, "Evento"); });
						});
						break;
					case "tecnologia":
						$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Dispositivo_infobox?action=raw", function(data) {
							errorHandler(function () { infoboxParser(data, "Dispositivo infobox"); });
						});
						break;
					default:
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
								var infoboxName = $("#selecionarInfoboxCustom").val();
								if (infoboxName == '' || chooseInfoboxTypeController ==  true)
									return;
								chooseInfoboxTypeController = true;
								userActions.infoboxType = infoboxName;
								if (infoboxName == "Batalha" || infoboxName == "Guerra")
								{
									var numParticipantes = '';
									while (numParticipantes != '4' && numParticipantes != '3' && numParticipantes != '2')
										numParticipantes = prompt("Quantos participantes? (2, 3 ou 4)")
									infoboxName = (infoboxName == "Batalha") ? "Battle" : "War";
									if (numParticipantes == '2')
										infoboxName += '300';
									else if (numParticipantes == '3')
										infoboxName += '350';
									else
										infoboxName += '400';
								}
								console.log('Obtendo "'+infoboxName+'"');
								//Tratar erro
								$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:"+encodeURI(infoboxName.replace(" ", "_"))+"?action=raw", function(data) {
									errorHandler(function() { infoboxParser(data, $("#selecionarInfoboxCustom").val()); });
								});
							})});
						})});
						break;
				}
			})});
		})});
	}
	var infoboxParser = function (txt, nome)
	{
		var infoboxContent = txt.split("</infobox>")[0] + "</infobox>"; //Tratar erro
		userActions.editor = (window.wgAction == 'edit') ? "source" : "VE";
		if (window.wgAction == 'edit' && $("#cke_21_label").length == 1)
		{
			$("#cke_21_label").click(); // For WYSIWYG editor
			ICP_wys = true;
			userActions.editor = "WYSIWYG";
		}
		var infoboxObj = $.parseXML(infoboxContent); //Tratar erro
		$("#CuratedContentToolModal header h3").text("Passo 2: Infobox");
		var passo2 = '<div style="position:relative"><div style="position:fixed;"><p>Preencha a infobox para o artigo</p>'+
		'<p>Ferramentas:</p><div class="ICPbuttons"><div id="linkButton"></div><div id="refButton"></div></div>'+
		'<br /><button>Pronto</button></div>';
		passo2 += '<aside class="portable-infobox pi-background pi-theme-Media pi-layout-default">'+
		'<h2 class="pi-item pi-item-spacing pi-title">'+wgTitle+'</h2>';
		artigoTexto += "{{"+nome+"\n";
		artigoTexto += "|nome-"+wgTitle+"\n";
		artigoTexto += "|imagem-\n";
		if (nome == "Personagem infobox")
		{
			var personagemTypes = txt.split("\n*");
			//console.log("N types: "+personagemTypes.length);
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
			if (typeof $(dataTag)[0].children[0] === "undefined")
				labelTagText = $(dataTag).attr('source')
			else
				labelTagText = $(dataTag)[0].children[0].innerHTML;
			passo2 += '<div class="pi-item pi-data pi-item-spacing pi-border-color">'+
			'<h3 class="pi-data-label pi-secondary-font">'+labelTagText+'</h3>'+
			'<div class="pi-data-value pi-font"><textarea placeholder="Preencher"'+//((i == 0) ? ' autofocus' : '')+
			'></textarea></div></div>';
			artigoTexto += "|"+($(dataTag).attr('source'))+"=\n";
		}
		artigoTexto += "}}\n";
		passo2 += '</aside>';
		$("#CuratedContentToolModal section").html(passo2);
		$("aside textarea").first().focus();
		$("aside textarea").first().blur();
		setTimeout(function () {$("aside textarea").first().focus(); }, 50);
		deltaTime = new Date().getTime();
		$("#CuratedContentToolModal section").css('overflow-y', 'auto');
		userActions.usageOfNewButtons = 0;
		if (typeof mw.toolbar === "undefined")
			importScriptURI("https://slot1-images.wikia.nocookie.net/__load/-/debug%3Dfalse%26lang%3Dpt-br%26skin%3Doasis%26version%3D1508417393-20171019T123000Z/jquery.textSelection%7Cmediawiki.action.edit");
		if (wgNamespaceNumber == 0)
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
			artigoTexto = subArtTxt[0].replace("|nome-", "|nome = ").replace("|imagem-", "|imagem = ").replace("|type-", "|type = "+$("#personagemTypes").val());
			for (var i=0; i<infTxts.length; i++)
			{
				artigoTexto += ' = '+$(infTxts[i]).val();
				artigoTexto += subArtTxt[i+1];
			}
			artigoTexto += "'''"+wgTitle+"''' foi um...";
			console.log(artigoTexto);
			inserirInterlink();
		})});
	}
	var inserirInterlink = function ()
	{
		$("#CuratedContentToolModal header h3").text("Passo 3: Fontes e Aparições");
		var passo4 = "<p>Por favor, insira o nome da página correspondente em inglês (nome da página na Wookieepedia):";
		passo4 += "<textarea id='wookieePage' name='wookieePage' >"
		+((artigoTipo == "personagem" || artigoTipo == "planeta" || artigoTipo == "droide") ? wgPageName.replace(/_/g, " ") : '')
		+"</textarea><button data-interlink='true'>Enviar</button>"
		+"<button data-prev='true'>Visualizar</button><button data-nope='true'>Não sei / não existe</button></p>";
		$("#CuratedContentToolModal section").html(passo4);
		deltaTime = new Date().getTime();
		$("#CuratedContentToolModal section button[data-interlink]").click(function() {
			if ($("#wookieePage").val() == '')
				return;
			userActions.passo3DT = (new Date().getTime()) - deltaTime;
			$("#CuratedContentToolModal section button").attr('disabled', '');
			userActions.interlink = $("#wookieePage").val();
			$.ajax({url:"http://www.99luca11.com/sww_helper?qm="+encodeURI($("#wookieePage").val().replace(" ", "_")), jsonp: "jsonpCallback", dataType: "JSONP"}); //Tratar erro
		});
		$("#CuratedContentToolModal section button[data-prev]").click(function() {
			window.open("http://starwars.wikia.com/wiki/"+encodeURI($("#wookieePage").val().replace(" ", "_")))
		});
		$("#CuratedContentToolModal section button[data-nope]").click(function() {
			userActions.interlink = false;
			userActions.passo3DT = (new Date().getTime()) - deltaTime;
			errorHandler(categorizar);
		});
	}
	//Função global pois JSONP assim requer... para isso, a SWWICP retorna uma função para "recupar" o fluxo
	window.jsonpCallback = function(data)
	{
		SWWICP.jsonpReturn(data);
	}
	var wookieeData = function (data)
	{
		var wookieePage = data.content;
		if (wookieePage === false)
		{
			alert("Página não encontrada!");
			$("#CuratedContentToolModal section button").removeAttr('disabled');
			return;
		}
		if (wookieePage.toLowerCase().substring(0, 9) == "#redirect")
		{
			$("#wookieePage").val(wookieePage.split("[[")[1].split("]]")[0]);
			$("#CuratedContentToolModal section button[data-interlink]").click();
			return;
		}
		wookieePage.replace("{{interlang", "{{Interlang");
		var wookieeSecoes = wookieePage.split("==");
		console.log(wookieeSecoes);
		var wookieeAparicoes = '';
		var wookieeFontes = '';
		for (i=0; i<wookieeSecoes.length; i++)
		{
			if ($.trim(wookieeSecoes[i]) == "Appearances")
			{
				wookieeAparicoes = wookieeSecoes[i+1];
				//TODO: Verficar por aparições não canônicas
			}
			else if ($.trim(wookieeSecoes[i]) == "Sources")
			{
				wookieeFontes = wookieeSecoes[i+1];
				break;
			}
		}
		artigoTexto += "\n\n";
		if (wookieeFontes.search("{{Interlang") >= 0)
			wookieeFontes = wookieeFontes.split("{{Interlang")[0]; //Tratar erro
		if (wookieePage.search("{{Interlang") >= 0)
			var wookieeInterlang = "{{Interlang\n|en="+$("#wookieePage").val()+wookieePage.split("{{Interlang")[1].split("}}")[0]+"}}"; //Tratar erro
		else
			var wookieeInterlang = "{{Interlang\n|en="+$("#wookieePage").val()+"\n}}";
		if (wookieeAparicoes != '')
			artigoTexto += "== Aparições =="+wookieeAparicoes;
		if (wookieeFontes != '')
			artigoTexto += "== Fontes =="+wookieeFontes;
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
	var categorizar = function ()
	{
		$("#CuratedContentToolModal header h3").text("Passo 4: Categorias");
		var passo5 = '<p>Para finalizar, categorize o artigo. Lembre-se de não ser reduntante: se categorizar '+
		'o artigo como "Mestre Jedi", por exemplo, NÃO o categorize como "Jedi".</p>';
		userActions.categorias = true;
		deltaTime = new Date().getTime();
		if (window.wgAction == 'edit')
		{
			$("#CuratedContentToolModal section").html(passo5);
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
			passo5 += '<p>Para isso, clique em "Categorias" no Editor Visual conforme lhe é apresentado e preencha o campo '
			+'com as categorias. Quando terminar, clique no botão "Aplicar mudanças".</p>';
			$("#CuratedContentToolModal section").html(passo5);
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
			//$("div.ve-ui-toolbar-saveButton a span.oo-ui-labelElement-label").text("Continuar");
			$("#CuratedContentToolModal span.close").click();
			$($("div.oo-ui-toolbar-tools div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup")[0]).addClass('oo-ui-popupToolGroup-active oo-ui-popupToolGroup-left');
			$("span.oo-ui-tool-name-wikiaSourceMode").css('border', '1px solid');
			$("span.oo-ui-tool-name-wikiaSourceMode a").click(function() {
				setTimeout(function() {
					if ($("textarea.ui-autocomplete-input").val().search("\\[\\[Categoria:") >= 0)
						$("textarea.ui-autocomplete-input").val(artigoTexto+"\n\n"+$("textarea.ui-autocomplete-input").val());
					else
						$("textarea.ui-autocomplete-input").val(artigoTexto);
					$("textarea.ui-autocomplete-input").change();
					setTimeout(function() {$("div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-labelElement.oo-ui-flaggedElement-progressive.oo-ui-flaggedElement-primary.oo-ui-buttonWidget.oo-ui-actionWidget.oo-ui-buttonElement-framed a.oo-ui-buttonElement-button").click();}, 1000);
				}, 2000);
			});
		}
		else
		{
			//Source editor and WYSIWYG editor
			var theTextarea = ($('#cke_contents_wpTextbox1 textarea')[0] || $('#wpTextbox1')[0]);
			theTextarea.value += artigoTexto;
			$("#CuratedContentToolModal span.close").click();
			if (ICP_wys == true)
				setTimeout(function() {$("#cke_22_label").click()}, 1500);
		}	
	}
	var sendFeedback = function() {
		//This is meant for collecting info about how people use this tool so that I can improve it a lot more. I am only sending people's hashID because I need to know when the data is from differente people or not. This will also be used to collect info when errors occur
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
	var init = function() {
		userActions.user = (window.wgGAUserIdHash || false);
		userActions.page = window.wgTitle;
		userActions.date = window.wgNow;
		userActions.errors = []
		if (window.wgArticleId === 0 && (window.wgNamespaceNumber == 114 || window.wgNamespaceNumber === 0))
		{
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
		isAlt: false
	}
})(jQuery);