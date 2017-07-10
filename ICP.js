/* ************************************************************************
************************* Page Creation Interface *************************
* This is a tool in development that helps new comers with the process of creating a new page. I need to gather more feedback before putting it on full use, so it is important that this code be placed here. Futhermore, I have discussed this with Fandom Staff, and I've got their approval.
*/
//TODO: mecanismo de log (obter dados de usuários, como quando abandonou a ICP, se houve bug, etc)
//TODO: try catch para erros e tratá-los!
artigoTexto = '';
artigoTipo = '';
function inserirBotaoNovaPagina() {
	//<iframe data-url="/main/edit?useskin=wikiamobile" id="CuratedContentToolIframe" class="curated-content-tool" name="curated-content-tool" src="/main/edit?useskin=wikiamobile"></iframe>
	if (wgAction == 'view' && artigoTexto != '') //Segunda chamada da Interface! Recarregar página!
		location.reload();
	$(document.head).append('<link rel="stylesheet" href="http://slot1.images3.wikia.nocookie.net/__am/1480421167/sass/background-dynamic%3Dtrue%26background-image%3Dhttp%253A%252F%252Fimg3.wikia.nocookie.net%252F__cb20150811224031%252Fpt.starwars%252Fimages%252F5%252F50%252FWiki-background%26background-image-height%3D1080%26background-image-width%3D1920%26color-body%3D%2523000000%26color-body-middle%3D%2523000000%26color-buttons%3D%2523006cb0%26color-header%3D%25233a5766%26color-links%3D%2523006cb0%26color-page%3D%2523ffffff%26oasisTypography%3D1%26page-opacity%3D100%26widthType%3D0/resources/wikia/ui_components/modal/css/modal_default.scss" />');
	$('body').append('<div id="blackout_CuratedContentToolModal" class="modal-blackout visible" style="z-index:"5000105>'
		+'<div id="CuratedContentToolModal" class="modal medium no-scroll curated-content-tool-modal ">'
			+'<header>'
				+'<span class="close">Close</span>'
					+'<h3>Criando um novo artigo</h3>'
			+'</header>'
			+'<section>'
				+'<p>Selecione um tipo de artigo:</p>'
				+'<table style="width:100%;border-spacing:3px;text-align:center;" id="NovaPaginaTipoDeArtigo">'
					+'<tr><td style="width:50%" data-tipo="personagem"><img src="https://www.jedipedia.net/w/images/4/48/Personen.png" /><br />Personagem</td>'
					+'<td data-tipo="planeta"><img src="https://www.jedipedia.net/w/images/1/16/Planeten.png" /><br />Planeta</td></tr>'
					+'<tr><td style="width:50%" data-tipo="droide"><img src="https://www.jedipedia.net/w/images/f/f0/Droiden.png" /><br />Droide</td>'
					+'<td data-tipo="espaçonave"><img src="https://www.jedipedia.net/w/images/4/4f/Raumschiffe-Icon.png" /><br />Espaçonave</td></tr>'
					+'<tr><td style="width:50%" data-tipo="evento"><img src="https://www.jedipedia.net/w/images/7/7a/Ereignisse.png" /><br />Evento</td>'
					+'<td data-tipo="tecnologia"><img src="https://www.jedipedia.net/w/images/8/8c/Waffen.png" /><br />Tecnologia</td></tr>'
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
	$("#CuratedContentToolModal span.close").click(function() {
		$("#blackout_CuratedContentToolModal").removeClass('visible');
	});
	$("#configuracoesICP").click(function () {
		configModal = "<form name='config_form'><p><label>Abrir Interface de Criação de Páginas sempre que iniciar nova página."+
		"<input type='checkbox' name='default_action' checked /></label></p></form>"
		$.showCustomModal('Configurações', configModal, {
			id: 'ModalSettingsWindow',
			width: 600,
			height: 250,
			buttons: [{
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
	$("#NovaPaginaTipoDeArtigo td").one("click", function() {
		artigoTipo = $(this).attr("data-tipo");
		console.log("Carregando modelo para "+artigoTipo);
		$("#CuratedContentToolModal header h3").text("Passo 1: Universo");
		passo1 = '<img src="';
		passo1 += (wgNamespaceNumber == 112) ? "http://vignette2.wikia.nocookie.net/pt.starwars/images/8/8d/Eras-legends.png" : "http://vignette2.wikia.nocookie.net/pt.starwars/images/0/07/Eras-canon-transp.png";
		passo1 += '" style="width:150px;float:right;" />';
		passo1 += '<p style="font-size:14px">Esse artigo pertence ao universo <span style="font-weight:bold">';
		if (wgNamespaceNumber == 112)
		{
			passo1 += 'Cânon';
			txtBotaoSim = 'Sim, também pertence ao <i>Legends</i>';
			txtBotaoNao = 'Não, pertence somente ao Cânon';
			artigoTexto = "{{Eras|canon";
		}
		else
		{
			passo1 += '<i>Legends</i>';
			txtBotaoSim = 'Sim, também pertence ao Cânon';
			txtBotaoNao = 'Não, pertence somente ao <i>Legends</i>';
			artigoTexto = "{{Eras|legends";
		}
		passo1 += '</span>. Ele pertence também ao outro universo?</p>';
		passo1 += '<p><button data-resp="s">'+txtBotaoSim+'</button><button data-resp="n">'+txtBotaoNao+'</button>';
		$("#CuratedContentToolModal section").html(passo1);
		$("#CuratedContentToolModal section button[data-resp]").one("click", function() {
			if ($(this).attr('data-resp') == "s")
				artigoTexto += (wgNamespaceNumber == 112) ? "|legends}}\n" : "|canon}}\n";
			else
				artigoTexto += "}}\n";
			console.log(artigoTexto);
			console.log("Obtendo infobox...");
			$("#CuratedContentToolModal section button[data-resp]").removeAttr("data-resp").attr('disabled');
			switch(artigoTipo) {
				case "personagem":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Personagem_infobox?action=raw", function(data) {
						infoboxParser(data, "Personagem infobox");
					});
					break;
				case "planeta":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Planeta?action=raw", function(data) {
						infoboxParser(data, "Planeta");
					});
					break;
				case "droide":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Droide_infobox?action=raw", function(data) {
						infoboxParser(data, "Droide infobox");
					});
					break;
				case "espaçonave":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Nave?action=raw", function(data) {
						infoboxParser(data, "Nave");
					});
					break;
				case "evento":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Evento?action=raw", function(data) {
						infoboxParser(data, "Evento");
					});
					break;
				case "tecnologia":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Dispositivo_infobox?action=raw", function(data) {
						infoboxParser(data, "Dispositivo infobox");
					});
					break;
				default:
					selecionarInfoboxCustom = "<p>Selecione uma infobox para seu artigo</p>"+
					'<select id="selecionarInfoboxCustom"><option value>Escolher infobox</option></select>'+
					'<button data-resp="s">Pronto</button>';
					$("#CuratedContentToolModal section").html(selecionarInfoboxCustom);
					$.get("http://pt.starwars.wikia.com/wiki/Ajuda:Predefini%C3%A7%C3%B5es/Infobox?action=raw", function(data) {
						var infoboxes = data.split("\n{{")
						for (var i=1; i<infoboxes.length; i++)
						{
							$("#selecionarInfoboxCustom").append('<option value="'+infoboxes[i].split("/preload")[0]+'">'+infoboxes[i].split("/preload")[0]+'</option>');
						}
						$("#CuratedContentToolModal section button[data-resp='s']").one("click", function() {
							$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:"+encodeURI($("#selecionarInfoboxCustom").val().replace(" ", "_"))+"?action=raw", function(data) {
								infoboxParser(data, $("#selecionarInfoboxCustom").val());
							});
						});
					});
					break;
			}
		});
	});
}
ICP_wys = false;
function infoboxParser(txt, nome)
{
	//TODO: Inserir campo "imagem"
	infoboxContent = txt.split("</infobox>")[0] + "</infobox>";
	if (wgAction == 'edit' && $("#cke_21_label").length == 1)
	{
	    $("#cke_21_label").click(); // For WYSIWYG editor
	    ICP_wys = true;
	}
	var infoboxObj = $.parseXML(infoboxContent);
	$("#CuratedContentToolModal header h3").text("Passo 2: Infobox");
	passo2 = "<p>Preencha a infobox para o artigo</p>";
	passo2 += '<aside class="portable-infobox pi-background pi-theme-Media pi-layout-default">'+
	'<h2 class="pi-item pi-item-spacing pi-title">'+wgTitle+'</h2>';
	artigoTexto += "{{"+nome+"\n";
	artigoTexto += "|nome-"+wgTitle+"\n";
	if (nome == "Personagem infobox")
	{
		personagemTypes = txt.split("\n*");
		console.log("N types: "+personagemTypes.length);
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
		dataTag = $(infoboxObj).find("data")[i];
		passo2 += '<div class="pi-item pi-data pi-item-spacing pi-border-color">'+
		'<h3 class="pi-data-label pi-secondary-font">'+$(dataTag)[0].children[0].innerHTML+'</h3>'+
		'<div class="pi-data-value pi-font"><textarea placeholder="Preencher"></textarea></div></div>';
		artigoTexto += "|"+($(dataTag).attr('source'))+"=\n";
	}
	artigoTexto += "}}\n";
	passo2 += '</aside><p><button>Pronto</button></p>';
	$("#CuratedContentToolModal section").html(passo2);
	$("#CuratedContentToolModal section").css('overflow-y', 'auto');
	$("#personagemTypes").change(function() {
		var type = $(this).val();
		$("#CuratedContentToolModal aside").removeClass(function (index, className) {
			return (className.match(/(^|\s)pi-theme-\S+/g) || []).join(" ");
		});
		$("#CuratedContentToolModal aside").addClass("pi-theme-"+type.replace(/ /g, "-"));
	});
	$("#CuratedContentToolModal section button").one("click", function() {
		var infTxts = $("#CuratedContentToolModal section aside textarea");
		var subArtTxt = artigoTexto.split("=");
		artigoTexto = subArtTxt[0].replace("|nome-", "|nome = ").replace("|type-", "|type = "+$("#personagemTypes").val());
		for (var i=0; i<infTxts.length; i++)
		{
			artigoTexto += ' = '+$(infTxts[i]).val();
			artigoTexto += subArtTxt[i+1];
		}
		artigoTexto += "'''"+wgTitle+"''' foi um...";
		console.log(artigoTexto);
		inserirInterlink();
	});
}
function inserirInterlink()
{
	$("#CuratedContentToolModal header h3").text("Passo 3: Fontes e Aparições");
	passo4 = "<p>Por favor, insira o nome da página correspondente em inglês (nome da página na Wookieepedia):";
	passo4 += "<textarea id='wookieePage' name='wookieePage' >"
	+((artigoTipo == "personagem" || artigoTipo == "planeta" || artigoTipo == "droide") ? wgPageName.replace(/_/g, " ") : '')
	+"</textarea><button data-interlink='true'>Enviar</button>"
	+"<button data-prev='true'>Visualizar</button><button data-nope='true'>Não sei / não existe</button></p>";
	$("#CuratedContentToolModal section").html(passo4);
	$("#CuratedContentToolModal section button[data-interlink]").click(function() {
		$("#CuratedContentToolModal section button").attr('disabled', '');
		$.ajax({url:"http://www.99luca11.com/sww_helper?qm="+encodeURI($("#wookieePage").val().replace(" ", "_")), jsonp: "jsonpCallback", dataType: "JSONP"});
	});
	$("#CuratedContentToolModal section button[data-prev]").click(function() {
		window.open("http://starwars.wikia.com/wiki/"+encodeURI($("#wookieePage").val().replace(" ", "_")))
	});
	$("#CuratedContentToolModal section button[data-nope]").click(function() {
		categorizar();
	});
}
function jsonpCallback(data)
{
	wookieePage = data.content;
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
	wookieeSecoes = wookieePage.split("==");
	console.log(wookieeSecoes);
	wookieeAparicoes = '';
	wookieeFontes = '';
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
		wookieeFontes = wookieeFontes.split("{{Interlang")[0];
	if (wookieePage.search("{{Interlang") >= 0)
		wookieeInterlang = "{{Interlang\n|en="+$("#wookieePage").val()+wookieePage.split("{{Interlang")[1].split("}}")[0]+"}}";
	else
		wookieeInterlang = "{{Interlang\n|en="+$("#wookieePage").val()+"\n}}";
	if (wookieeAparicoes != '')
		artigoTexto += "== Aparições =="+wookieeAparicoes;
	if (wookieeFontes != '')
		artigoTexto += "== Fontes =="+wookieeFontes;
	artigoTexto += wookieeInterlang;
	$.get("http://pt.starwars.wikia.com/wiki/Star_Wars_Wiki:Ap%C3%AAndice_de_Tradu%C3%A7%C3%A3o_de_obras/JSON?action=raw", function(data) {
		fixes = JSON.parse(data.replace("<pre>", '').replace("</pre>", ''));
		console.log("Apêndice de obras obtido.");
		for (var i=0; i<fixes.replacements.length; i++) {
			var txtRegEx = new RegExp(fixes.replacements[i][0], "g");
			artigoTexto = artigoTexto.replace(txtRegEx, fixes.replacements[i][1]);
		}
		categorizar()
	});
}
function categorizar()
{
	$("#CuratedContentToolModal header h3").text("Passo 4: Categorias");
	var passo5 = '<p>Para finalizar, categorize o artigo. Lembre-se de não ser reduntante: se categorizar '+
	'o artigo como "Mestre Jedi", por exemplo, NÃO o categorize como "Jedi".</p>';
	if (wgAction == 'edit')
	{
		$("#CuratedContentToolModal section").html(passo5);
		$("div [data-id='categories']").appendTo("#CuratedContentToolModal section");
		$("#CuratedContentToolModal section").append("<p><button>Terminei</button></p>");
		$("#CuratedContentToolModal section button").click(function () {
			$("div [data-id='categories']").insertAfter("div [data-id='insert']");
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
					$("span.oo-ui-tool-name-categories").css('border', '0px solid');
					$("#blackout_CuratedContentToolModal").addClass('visible');
					finalizarEdicao();
				});
			}, 1500);
		});
		$("div.oo-ui-layout.oo-ui-panelLayout.oo-ui-panelLayout-scrollable.oo-ui-panelLayout-expanded.oo-ui-pageLayout:nth-of-type(3)").appendTo("#CuratedContentToolModal section");
	}
}
function finalizarEdicao()
{
	artigoTexto += "\n\n"+"<!-- Artigo gerado pelo ICP -->";
	if (wgAction == "view")
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
			}, 1500);
		});
	}
	else
	{
		//Source editor (hopefully)
		var theTextarea = ($('#cke_contents_wpTextbox1 textarea')[0] || $('#wpTextbox1')[0]);
		theTextarea.value += artigoTexto;
		$("#CuratedContentToolModal span.close").click();
		if (ICP_wys == true)
		    setTimeout(function() {$("#cke_22_label").click()}, 1500);
	}	
}
 
$(document).ready(function() {
    if (wgArticleId === 0 && (wgNamespaceNumber == 112 || wgNamespaceNumber === 0))
	{
		var opcoesICP = {}
		if (localStorage.ICPsettings)
			opcoesICP = JSON.parse(localStorage.ICPsettings);
		else
			opcoesICP.default_action = 1;
		if (opcoesICP.default_action == 0)
		{
			$("#WikiaBarWrapper ul.tools").append('<li id="ICP_opener"><a href="#">Int. Criação Página</a></li>');
			$("#ICP_opener").click(function() { inserirBotaoNovaPagina(); });
		}
		else
		{
			if (wgAction == 'edit')
				inserirBotaoNovaPagina();
			if (wgAction == 'view')
				if (document.location.href.search("veaction=edit") >= 0)
					inserirBotaoNovaPagina();
				else
					$("#ca-ve-edit").click(function () { inserirBotaoNovaPagina(); });
		}
	}
 
});