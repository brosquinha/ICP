import textwrap
from random import choice

from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select, WebDriverWait

from tests.support import ICPTestSuite, Support


class TestICPSource(ICPTestSuite):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
    
    def setUp(self):
        super().setUp()
        self.support.treat_eventual_alert()
        super().set_up("https://starwars.fandom.com/pt/wiki/Teste?action=edit&useeditor=source")

    def test_icp_full_basic_flow(self):
        h3 = self.support.get_modal_title()
        self.assertEqual(h3.text, "Criando um novo artigo")

        self.support.skip_step_0()
        h3 = self.support.get_modal_title()
        self.assertEqual(h3.text, "Passo 2: Universo")

        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()
        h3 = self.support.get_modal_title()
        self.assertEqual(h3.text, "Passo 3: Infobox")
        self.driver.find_element_by_tag_name("aside")
        self.driver.find_element_by_css_selector("aside textarea")

        self.support.skip_step_2()
        h3 = self.support.get_modal_title()
        self.assertEqual(h3.text, "Passo 4: Fontes e Aparições")
        self.driver.find_element_by_id("wookieePage")

        self.support.skip_step_3()
        h3 = self.support.get_modal_title()
        self.assertEqual(h3.text, "Passo 5: Categorias")
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal div.CategorySelect input")

        self.support.skip_step_4()
        textarea_value = self.support.get_source_textarea_value()
        self.assertIn("{{Eras|canon|legends}}", textarea_value)
        self.assertIn("{{Personagem infobox\n|nome = Teste\n", textarea_value)
        self.assertIn("== Notas e referências ==\n", textarea_value)

    def test_anon_confirmation_leave(self):
        self.driver.get("https://starwars.fandom.com/pt/wiki/Teste?action=edit&useeditor=source&redlink=1")
        self.support.wait_for_icp()
        self.driver.execute_script(self.icp_content)
        self.support.wait_for_new_icp(self.icp_content)

        modal = self.driver.find_element_by_css_selector("#CuratedContentToolModal")
        self.assertEqual(modal.value_of_css_property("width"), "500px")

        self.driver.find_element_by_css_selector("#CuratedContentToolModal section button.secondary").click()
        self.assertEqual(self.driver.current_url, "https://starwars.fandom.com/pt/wiki/Teste?action=edit&useeditor=source")

    def test_anon_confirmation_confirm(self):
        redlink_url = "https://starwars.fandom.com/pt/wiki/Teste?action=edit&useeditor=source&redlink=1"
        self.driver.get(redlink_url)
        self.support.wait_for_icp()
        self.driver.execute_script(self.icp_content)
        self.support.wait_for_new_icp(self.icp_content)

        modal = self.driver.find_element_by_css_selector("#CuratedContentToolModal")
        self.assertEqual(modal.value_of_css_property("width"), "500px")

        self.driver.find_element_by_css_selector("#CuratedContentToolModal section button:not(.secondary)").click()
        self.assertEqual(self.driver.current_url, redlink_url)

        self.assertNotEqual(modal.value_of_css_property("width"), "500px")
        self.support.skip_step_0()

    def test_eras_only_canon(self):
        self.support.skip_step_0()

        self.driver.find_element_by_css_selector("section button:nth-of-type(2)").click()
        
        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()
        self.support.skip_step_4()

        textarea_value = self.support.get_source_textarea_value()
        self.assertIn("{{Eras|canon}}", textarea_value)

    def test_eras_only_legends(self):
        self.support.get_legends_article(self.icp_content)

        self.support.skip_step_0()

        self.driver.find_element_by_css_selector("section button:nth-of-type(2)").click()

        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()
        self.support.skip_step_4()

        textarea_value = self.support.get_source_textarea_value()
        self.assertIn("{{Eras|legends}}", textarea_value)

    def test_eras_both_legends_and_canon(self):
        self.support.get_legends_article(self.icp_content)

        self.support.skip_step_0()

        self.driver.find_element_by_css_selector("section button:nth-of-type(1)").click()

        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()
        self.support.skip_step_4()

        textarea_value = self.support.get_source_textarea_value()
        self.assertIn("{{Eras|legends|canon}}", textarea_value)

    def test_out_universe_canon_article(self):
        self.support.choose_infobox("Infobox TV")

        self.support.wait_for_infobox_type_gathering()
        self.driver.find_element_by_css_selector("section button:nth-of-type(1)").click()

        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()
        self.support.skip_step_4()

        textarea_value = self.support.get_source_textarea_value()
        self.assertIn("{{Eras|canon|real}}", textarea_value)

    def test_out_universe_legends_article(self):
        self.support.choose_infobox("Infobox TV")

        self.support.wait_for_infobox_type_gathering()
        self.driver.find_element_by_css_selector("section button:nth-of-type(2)").click()

        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()
        self.support.skip_step_4()

        textarea_value = self.support.get_source_textarea_value()
        self.assertIn("{{Eras|legends|real}}", textarea_value)

    def test_out_universe_no_universe_article(self):
        self.support.choose_infobox("Infobox TV")

        self.support.wait_for_infobox_type_gathering()
        self.driver.find_element_by_css_selector("section button:nth-of-type(3)").click()

        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()
        self.support.skip_step_4()

        textarea_value = self.support.get_source_textarea_value()
        self.assertIn("{{Eras|real}}", textarea_value)

    def test_infobox_personagem_generation(self):
        self.support.skip_step_0()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()

        select_types = Select(self.driver.find_element_by_id('personagemTypes'))
        chosen_option = choice(select_types.options[1:]).get_attribute('value')
        select_types.select_by_value(chosen_option)
        css_pi_class = chosen_option.replace(" ", "-")
        aside_class = self.driver.find_element_by_css_selector(
            "aside.portable-infobox").get_attribute('class')
        self.assertIn('pi-theme-%s' % css_pi_class, aside_class)

        counter = 1
        for txtarea in self.support.get_infobox_textareas():
            txtarea.send_keys(counter)
            counter += 1
        self.support.skip_step_2()

        self.support.skip_step_3()
        self.support.skip_step_4()
        wikitext = self.support.get_source_textarea_value()

        excepted = textwrap.dedent("""\
        {{Personagem infobox
        |nome = Teste
        |imagem = 
        |type = %s
        |planetanatal = 1
        |nascimento = 2
        |morte = 3
        |especie = 4
        |subespecie = 5
        |genero = 6
        |altura = 7
        |peso = 8
        |cabelo = 9
        |olhos = 10
        |pele = 11
        |cibernética = 12
        |era = 13
        |clã = 14
        |kajidic = 15
        |afiliação = 16
        |casta = 17
        |domínio = 18
        |mestres = 19
        |aprendizes = 20
        }}""" % chosen_option)
        self.assertIn(excepted, wikitext)

    def test_other_infoboxes(self):
        self.support.choose_outros_step_0()
        h3 = self.support.get_modal_title()
        self.assertEqual(h3.text, "Criando um novo artigo")

        self.support.wait_for_all_infoboxes_ready()
        infobox_select = Select(self.driver.find_element_by_css_selector(
            "#blackout_CuratedContentToolModal select"))
        available_infoboxes = infobox_select.options
        self.assertGreater(len(available_infoboxes), 5)
        blacklist = ['Infobox Usuário', 'Batalha', 'Guerra', 'Missão']
        chosen_infobox = blacklist[0]
        while chosen_infobox in blacklist:
            chosen_infobox = choice(available_infoboxes[1:]).get_attribute('value')
        infobox_select.select_by_value(chosen_infobox)
        self.driver.find_element_by_css_selector("section button").click()
        self.support.wait_for_infobox_type_gathering()

        h3 = self.support.get_modal_title()
        if "Passo 2" in h3.text:
            self.support.skip_step_1()
        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()
        self.support.skip_step_4()
        wikitext = self.support.get_source_textarea_value()
        self.assertIn("{{%s" % chosen_infobox, wikitext)

    def test_real_world_infobox_skips_step_1(self):
        self.support.choose_infobox("Pessoa infobox")
        self.support.wait_for_step_2_ready()

    def test_media_infobox_proper_step_1(self):
        self.support.choose_infobox("Quadrinhos")
        self.support.wait_for_infobox_type_gathering()
        buttons = self.driver.find_elements_by_css_selector("section button")
        self.assertEqual(len(buttons), 3)

    def test_in_universe_infobox_proper_step_1(self):
        self.support.choose_infobox("Lua")
        self.support.wait_for_infobox_type_gathering()
        buttons = self.driver.find_elements_by_css_selector("section button")
        self.assertEqual(len(buttons), 2)

    def test_guerra_batalha_missao_infoboxes(self):
        self.support.choose_infobox(choice(['Batalha', 'Missão', 'Guerra']))
        prompt = self.driver.switch_to.alert
        prompt.send_keys('7')
        prompt.accept()
        prompt = self.driver.switch_to.alert
        prompt.dismiss()
        prompt = self.driver.switch_to.alert
        prompt.send_keys(choice(['2', '3', '4']))
        prompt.accept()
        self.support.wait_for_infobox_type_gathering()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()

    def test_step_2_link_button_canon(self):
        self.support.skip_step_0()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()

        button = self.driver.find_element_by_id("linkButton")
        button.click()
        infobox_textareas = self.support.get_infobox_textareas()
        self.assertEqual(infobox_textareas[0].get_attribute('value'), "[[Exemplo]]")

        chosen_textarea = choice(infobox_textareas[1:])
        chosen_textarea.send_keys('Teste')
        self.support.select_written_text()
        button.click()
        self.assertEqual(chosen_textarea.get_attribute('value'), "[[Teste]]")

    def test_step_2_link_button_legends(self):
        self.support.get_legends_article(self.icp_content)
        self.support.skip_step_0()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()

        button = self.driver.find_element_by_id("linkButton")
        button.click()
        infobox_textareas = self.support.get_infobox_textareas()
        self.assertEqual(infobox_textareas[0].get_attribute('value'), "{{SUBST:L|Exemplo}}")

        chosen_textarea = choice(infobox_textareas[1:])
        chosen_textarea.send_keys('Teste')
        self.support.select_written_text()
        button.click()
        self.assertEqual(chosen_textarea.get_attribute('value'), "{{SUBST:L|Teste}}")

    def test_step_2_refs_button(self):
        self.support.skip_step_0()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()

        button = self.driver.find_element_by_id("refButton")
        button.click()
        infobox_textareas = self.support.get_infobox_textareas()
        self.assertEqual(infobox_textareas[0].get_attribute('value'), '<ref name="NOME">Exemplo</ref>')

        chosen_textarea = choice(infobox_textareas[1:])
        chosen_textarea.send_keys('Teste')
        self.support.select_written_text()
        button.click()
        self.assertEqual(chosen_textarea.get_attribute('value'), '<ref name="NOME">Teste</ref>')

    def test_wookieepedia_import_in_universe_wo_succession_box(self):
        self.support.skip_step_0()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()

        self.support.choose_wookiee_article("Alderaan")

        self.support.wait_for_wookiee_response()
        self.support.skip_step_4()

        wikitext = self.support.get_source_textarea_value()
        self.assertIn("\n== Aparições ==\n", wikitext)
        self.assertIn("\n*{{Filme|III}}", wikitext)
        self.assertNotIn("*[[Star Wars: Episode III Revenge of the Sith|", wikitext)
        self.assertIn("\n*[[Ahsoka (romance)|", wikitext)
        self.assertNotIn("*[[Ahsoka (novel)|", wikitext)
        self.assertIn("\n*''[[Estrelas Perdidas]]''", wikitext)
        self.assertNotIn("*''[[Lost Stars]]''", wikitext)
        self.assertIn("\n== Fontes ==\n", wikitext)
        self.assertIn("{{ICPDisclaimer}}{{Interlang\n|en=Alderaan\n", wikitext)

    def test_wookieepedia_import_in_universe_with_succession_box(self):
        self.support.skip_step_0()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()

        self.support.choose_wookiee_article("Darth Sidious")

        self.support.wait_for_wookiee_response()
        self.support.skip_step_4()

        wikitext = self.support.get_source_textarea_value()
        self.assertIn("\n== Aparições ==\n", wikitext)
        self.assertIn("\n*{{Filme|III}}", wikitext)
        self.assertNotIn("*[[Star Wars: Episode III Revenge of the Sith|", wikitext)
        self.assertIn("\n*[[Ahsoka (romance)|", wikitext)
        self.assertNotIn("*[[Ahsoka (novel)|", wikitext)
        self.assertIn("*''[[Lordes dos Sith]]''", wikitext)
        self.assertNotIn("\n*''[[Lords of the Sith]]''", wikitext)
        self.assertIn("\n== Fontes ==\n", wikitext)
        self.assertIn("{{Traduzir}}{{Caixa inicio}}", wikitext)
        self.assertIn("{{Caixa de sucessão\n|", wikitext)
        self.assertNotIn("{{Succession box", wikitext)
        self.assertIn("\n|antes-anos =", wikitext)
        self.assertNotIn("\n|before-years", wikitext)
        self.assertIn("{{ICPDisclaimer}}{{Interlang\n|en=Darth Sidious\n", wikitext)

    def test_wookieepedia_import_out_universe(self):
        self.support.choose_infobox("Pessoa infobox")
        self.support.wait_for_infobox_type_gathering()
        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()

        self.support.choose_wookiee_article("Dave Filoni")

        self.support.wait_for_wookiee_response()
        self.support.skip_step_4()

        wikitext = self.support.get_source_textarea_value()
        self.assertIn("\n== Bibliografia ==\n", wikitext)
        self.assertIn("{{ICPDisclaimer}}{{Interlang\n|en=Dave Filoni\n", wikitext)
    
    def test_categories(self):
        self.support.skip_step_0()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()

        self.driver.find_element_by_id("CategorySelectInput").send_keys('Machos')
        self.driver.find_element_by_id("CategorySelectInput").send_keys(Keys.ENTER)
        self.support.skip_step_4()

        self.driver.find_element_by_id("wpDiff").click()
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_elements_by_css_selector("td.diff-addedline")
        )
        self.assertIn(
            "[[Categoria:Machos]]",
            [x.text for x in self.driver.find_elements_by_css_selector("td.diff-addedline div")]
        )

    def test_return_steps(self):
        self.support.skip_step_0()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()

        self.support.return_to_step(4)
        self.assertEqual(self.support.get_modal_title().text, "Passo 4: Fontes e Aparições")

        self.support.return_to_step(3)
        self.assertEqual(self.support.get_modal_title().text, "Passo 3: Infobox")

        self.support.return_to_step(2)
        self.assertEqual(self.support.get_modal_title().text, "Passo 2: Universo")

        self.support.return_to_step(1)
        self.assertEqual(self.support.get_modal_title().text, "Criando um novo artigo")

    def test_return_steps_latest_wikitext_goes(self):
        self.support.skip_step_0()
        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()
        self.support.skip_step_2()
        self.support.skip_step_3()

        self.support.return_to_step(1)
        self.support.choose_infobox("Planeta")
        self.support.wait_for_infobox_type_gathering()
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal button:nth-of-type(2)").click()
        self.support.wait_for_step_2_ready()

        self.support.skip_step_2()
        self.support.choose_wookiee_article("Exegol")
        self.support.wait_for_wookiee_response()
        self.support.skip_step_4()

        wikitext = self.support.get_source_textarea_value()
        self.assertIn("{{Eras|canon}}", wikitext)
        self.assertNotIn("{{Eras|canon|legends}}", wikitext)
        self.assertIn("{{Planeta\n", wikitext)
        self.assertNotIn("{{Personagem\n", wikitext)
        self.assertIn("{{Interlang\n", wikitext)

    def test_config_always_show_on_page_creation(self):
        self.driver.find_element_by_id("configuracoesICP").click()
        self.driver.find_element_by_css_selector(".modalContent input[type='checkbox']").click()
        self.driver.find_elements_by_css_selector(".modalContent .wikia-button.secondary")[2].click()
        alert = self.driver.switch_to.alert
        alert.dismiss()

        self.driver.refresh()
        self.assertEqual(self.driver.find_elements_by_css_selector("#blackout_CuratedContentToolModal"), [])

    def test_config_version(self):
        self.driver.find_element_by_id("configuracoesICP").click()
        icp_version = self.support.get_new_icp_version(self.icp_content)
        self.assertIn(icp_version, self.driver.find_element_by_css_selector(".modalContent div>p").text)
    
    def tearDown(self):
        # print(list(filter(lambda x: 'ICP' in x['message'], self.driver.get_log('browser'))))
        self.driver.execute_script("window.localStorage.clear();")
        self.driver.refresh()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
