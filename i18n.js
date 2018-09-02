class I18n {
    constructor(lang) {
        this._messages = {
            'pt-br': {
                'redlink-anon-welcome': 'Você seguiu para uma página que não existe. Para criá-la, clique em "Continuar". Para voltar a navegar na Star Wars Wiki, clique em "Voltar".'
            }
        };
        if (!(lang in this._messages))
            this._language = 'pt-br';
        else
            this._language = lang;
    }

    getMessage(msg) {
        return this._messages[this._language][msg];
    }
}
