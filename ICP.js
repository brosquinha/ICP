artigoTexto = '';
artigoTipo = '';
function inserirBotaoNovaPagina() {
	//Verificar se é modo Visual ou Fonte
	//<iframe data-url="/main/edit?useskin=wikiamobile" id="CuratedContentToolIframe" class="curated-content-tool" name="curated-content-tool" src="/main/edit?useskin=wikiamobile"></iframe>
	$(document.head).append('<link rel="stylesheet" href="http://slot1.images3.wikia.nocookie.net/__am/1480421167/sass/background-dynamic%3Dtrue%26background-image%3Dhttp%253A%252F%252Fimg3.wikia.nocookie.net%252F__cb20150811224031%252Fpt.starwars%252Fimages%252F5%252F50%252FWiki-background%26background-image-height%3D1080%26background-image-width%3D1920%26color-body%3D%2523000000%26color-body-middle%3D%2523000000%26color-buttons%3D%2523006cb0%26color-header%3D%25233a5766%26color-links%3D%2523006cb0%26color-page%3D%2523ffffff%26oasisTypography%3D1%26page-opacity%3D100%26widthType%3D0/resources/wikia/ui_components/modal/css/modal_default.scss" />');
	$('body').append('<div id="blackout_CuratedContentToolModal" class="modal-blackout visible">'
		+'<div id="CuratedContentToolModal" class="modal medium no-scroll curated-content-tool-modal ">'
			+'<header>'
				+'<a href="#" class="close" title="">Close</a>'
					+'<h3>Criando um novo artigo</h3>'
			+'</header>'
			+'<section>'
				+'<p>Selecione um tipo de artigo:</p>'
				+'<table style="width:100%;border-spacing:3px;text-align:center;" id="NovaPaginaTipoDeArtigo">'
					+'<tr><td style="width:50%">Personagem</td><td>Planeta</td></tr>'
					+'<tr><td style="width:50%">Droide</td><td>Espaçonave</td></tr>'
					+'<tr><td style="width:50%">Evento</td><td>Tecnologia</td></tr>'
				+'</table>'
				+'<p>Outro tipo de artigo</p>'
			+'</section>'
			+'<footer>'
				+'<div class="buttons">'
				+'</div>'
			+'</footer>'
		+'</div>'
	+'</div>');
	$("#CuratedContentToolModal a.close").click(function() {
		$("#blackout_CuratedContentToolModal").removeClass('visible');
	});
	$("#NovaPaginaTipoDeArtigo td").click(function() {
		artigoTipo = this.innerHTML.toLowerCase();
		console.log("Carregando modelo para "+artigoTipo);
		$("#CuratedContentToolModal header h3").text("Passo 1: Universo");
		passo1 = '<p>Esse artigo pertence ao universo ';
		if (wgNamespaceNumber == 112)
		{
			passo1 += 'Cânon';
			artigoTexto = "{{Eras|canon";
		}
		else
		{
			passo1 += '<i>Legends</i>';
			artigoTexto = "{{Eras|legends";
		}
		passo1 += '. Ele pertence também ao outro universo?</p>';
		passo1 += '<p><button data-resp="s">Sim</button><button data-resp="n">Não</button>';
		$("#CuratedContentToolModal section").html(passo1);
		$("#CuratedContentToolModal section button[data-resp]").click(function() {
			console.log("Usuário respondeu "+this.innerHTML);
			if (this.innerHTML == "Sim")
				artigoTexto += (wgNamespaceNumber == 112) ? "|legends}}\n" : "|canon}}\n";
			else
				artigoTexto += "}}\n";
			//console.log(artigoTexto);
			console.log("Obtendo infobox...");
			switch(artigoTipo) {
				case "personagem":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Personagem_infobox?action=raw", function(data) {
						infoboxContent = data.split("</infobox>")[0] + "</infobox>";
						//console.log(infoboxContent);
						infoboxParser(infoboxContent, "Personagem infobox");
					});
					break;
				case "planeta":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Planeta?action=raw", function(data) {
						infoboxContent = data.split("</infobox>")[0] + "</infobox>";
						infoboxParser(infoboxContent, "Planeta");
					});
					break;
				case "droide":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Droide_infobox?action=raw", function(data) {
						infoboxContent = data.split("</infobox>")[0] + "</infobox>";
						infoboxParser(infoboxContent, "Droide infobox");
					});
					break;
				case "espaçonave":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Nave?action=raw", function(data) {
						infoboxContent = data.split("</infobox>")[0] + "</infobox>";
						infoboxParser(infoboxContent, "Nave");
					});
					break;
				case "evento":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Evento?action=raw", function(data) {
						infoboxContent = data.split("</infobox>")[0] + "</infobox>";
						infoboxParser(infoboxContent, "Evento");
					});
					break;
				case "tecnologia":
					$.get("http://pt.starwars.wikia.com/wiki/Predefini%C3%A7%C3%A3o:Dispositivo_infobox?action=raw", function(data) {
						infoboxContent = data.split("</infobox>")[0] + "</infobox>";
						infoboxParser(infoboxContent, "Dispositivo infobox");
					});
					break;
			}
		});
	});
}
function infoboxParser(txt, nome)
{
	var infoboxObj = $.parseXML(txt);
	$("#CuratedContentToolModal header h3").text("Passo 2: Infobox");
	passo2 = "<p>Preencha a infobox para o artigo</p>";
	passo2 += '<aside class="portable-infobox pi-background pi-theme-Media pi-layout-default">'+
	'<h2 class="pi-item pi-item-spacing pi-title">'+wgTitle+'</h2>';
	artigoTexto += "{{"+nome+"\n";
	artigoTexto += "|nome-"+wgTitle+"\n";
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
	$("#CuratedContentToolModal section button").click(function() {
		var infTxts = $("#CuratedContentToolModal section aside textarea");
		var subArtTxt = artigoTexto.split("=");
		artigoTexto = subArtTxt[0].replace("|nome-", "|nome=");
		for (var i=0; i<infTxts.length; i++)
		{
			artigoTexto += '='+$(infTxts[i]).val();
			artigoTexto += subArtTxt[i+1];
		}
		artigoTexto += "'''"+wgTitle+"''' foi um...";
		console.log(artigoTexto);
 
		inserirInterlink();
	});
}
function inserirInterlink()
{
	$("#CuratedContentToolModal header h3").text("Passo 4: Fontes e Aparições");
	passo4 = "<p>Por favor, insira o nome da página correspondente em inglês (nome da página na Wookieepedia):";
	passo4 += "<form name='form1' style='display:inline;'><input type='text' id='wookieePage' name='wookieePage' /></form><button data-interlink='true'>Enviar</button></p>";
	$("#CuratedContentToolModal section").html(passo4);
	$("#CuratedContentToolModal section button[data-interlink]").click(function() {
		$.get("http://pt.starwars.wikia.com/wiki/en:"+encodeURI(document.form1.wookieePage.value)+"?action=raw", function(data) {
			//Procurar por fontes e aparições e traduzir da mesma forma que o BB-08 traduz
			console.log(data);
 
			if (wgAction == "view")
			{
				//Visual Editor
				var botaoParaClicar = $("span.oo-ui-tool-name-wikiaSourceMode span.oo-ui-tool-title").text();
				alert("Por favor, clique em \""+botaoParaClicar+"\" e aguarde alguns segundos.");
				//$("div.ve-ui-toolbar-saveButton a span.oo-ui-labelElement-label").text("Continuar");
 
				$("#CuratedContentToolModal a.close").click();
				$($("div.oo-ui-toolbar-tools div.oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup")[0]).addClass('oo-ui-popupToolGroup-active oo-ui-popupToolGroup-left');
				$("span.oo-ui-tool-name-wikiaSourceMode").css('border', '1px solid');
				$("span.oo-ui-tool-name-wikiaSourceMode a").click(function() {
					setTimeout(function() {
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
				$("#CuratedContentToolModal a.close").click();
			}
		});
	});
}
 
function inserirSelecionarUniverso(e) {
	if (e.target.id != "blackout_CreatePageModalDialog") return;
	$("#CreatePageDialogChoose").before('<label><b>Qual universo?</b> <select name="universo" id="selecionarUniverso">'+
	'<option value="Legends">Legends</option><option value="canon">Cânon</option></select></label>');
	$("#selecionarUniverso").change(function () {
		if ($(this).val() == "canon")
			document.CreatePageForm.wpCreatepageDialogTitle.value = "Cânon:"+document.CreatePageForm.wpCreatepageDialogTitle.value;
		else
			document.CreatePageForm.wpCreatepageDialogTitle.value = document.CreatePageForm.wpCreatepageDialogTitle.value.replace("Cânon:", '');
	});
}
$(document).ready(function() {
    $("body").on('DOMNodeInserted', inserirSelecionarUniverso);
    if (wgAction == "edit")
        $("img[title='Cânon link']").attr('accesskey', 'c');
    if (wgArticleId === 0 && (wgNamespaceNumber == 112 || wgNamespaceNumber === 0))
		if (wgAction == 'edit')
			inserirBotaoNovaPagina();
		if (wgAction == 'view')
			if (document.location.href.search("veaction=edit") > 0)
				inserirBotaoNovaPagina();
			else
				$("#ca-ve-edit").click(function () { inserirBotaoNovaPagina(); });
});