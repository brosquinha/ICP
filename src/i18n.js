export default class I18n {
    constructor(lang) {
        this._messages = {
            'pt-br': {
                'redlink-anon-welcome': 'Você seguiu para uma página que não existe. Para criá-la, clique em "Continuar". Para voltar a navegar na Star Wars Wiki, clique em "Voltar".',
                'error-handler-msg': 'Ocorreu um erro. Um relatório sobre esse inconveniente está sendo enviado para os administradores. Sua edição até aqui será salva.',
                'article-selection-intro': 'Selecione um tipo de artigo:',
                'article-selection-others': 'Outro tipo de artigo',
                'initial-modal-title': 'Criando um novo artigo',
                'settings-button': 'Configurações'
            }
        };
        if (!(lang in this._messages))
            this._language = 'pt-br';
        else
            this._language = lang;
    }

    getMessage(msg) {
        return (this._messages[this._language][msg] || msg);
    }
}
