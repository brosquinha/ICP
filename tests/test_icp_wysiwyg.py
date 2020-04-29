import time

from tests.support import ICPTestSuite, Support

from selenium.webdriver.support.ui import WebDriverWait

class TestICPWYSIWYG(ICPTestSuite):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

    def setUp(self):
        self.driver.implicitly_wait(3)
        self.driver.get("https://starwars.fandom.com/pt/wiki/Teste?action=edit&useeditor=visual")
        self.support = Support(self.driver)

    def test_icp_full_basic_flow(self):
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Criando um novo artigo"
        )
        time.sleep(2)

        self.support.skip_step_0()
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 1: Universo")

        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 2: Infobox")
        self.driver.find_element_by_tag_name("aside")
        self.driver.find_element_by_css_selector("aside textarea")

        self.support.skip_step_2()
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 3: Fontes e Aparições")
        self.driver.find_element_by_id("wookieePage")

        self.support.skip_step_3()
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 4: Categorias")
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal div.CategorySelect input")

        self.support.skip_step_4()
        textarea_value = self.support.get_source_textarea_value()
        self.assertIn("{{Eras|canon|legends}}", textarea_value)
        self.assertIn("{{Personagem infobox\n|nome = Teste\n", textarea_value)
        self.assertIn("== Notas e referências ==\n", textarea_value)

        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_elements_by_css_selector("#cke_1_contents iframe")
        )
        self.driver.switch_to.frame(self.driver.find_element_by_css_selector("#cke_1_contents iframe"))
        self.driver.find_element_by_id("title-eraicons")
        self.driver.find_element_by_css_selector("#bodyContent aside.portable-infobox")
        self.assertEqual(self.driver.find_elements_by_css_selector("#bodyContent h2")[1].text, "Notas e referências")

    def tearDown(self):
        self.driver.execute_script("window.localStorage.clear();")
        self.driver.refresh()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
