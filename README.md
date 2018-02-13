# Interface de Criação de Páginas (ICP)
A Interface de Criação de Páginas é uma ferramenta escrita em JavaScript feita para a Star Wars Wiki em Português (http://pt.starwars.wikia.com/wiki/P%C3%A1gina_principal) com o propósito de facilitar a criação de novos artigos na wiki. Ela é basicamente uma janela modal que divide o processo de criação de novas páginas em um passo-a-passo simples. 
Com essa ferramenta, usuários podem inserir predefinições importantes, como Eras e infoboxes, além de fontes e categorias.

# Repositório no GitHub
Conforme sua complexidade foi aumentando, foi ficando claro a importância de se fazer o controle de versões da ICP. Além disso, como é um dos script mais importantes e impactantes da Star Wars Wiki, também se mostrou interessante a possibilidade de tornar públicas versões betas para testadores, a fim de garantir que a versão final publicada tenha o mínimo de bugs. 

# Teste versões beta!
Para testar a última versão beta da ICP, simplesmente copie a seguinte linha no console de desenvolvedor do seu navegador quando a ICP estiver aberta ou, se preferir, copie em seu JavaScript pessoal: 
```javascript
var ICPBeta = setInterval(function() {
  if (typeof SWWICP !== "undefined") {
    importScriptURI("http://rawgit.com/brosquinha/ICP/master/ICP.js");
    clearInterval(ICPBeta);
  }
}, 200);
```
