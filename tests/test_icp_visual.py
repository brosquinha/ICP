import time

from tests.support import ICPTestSuite, Support

from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select, WebDriverWait

class TestICPVisual(ICPTestSuite):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

    def setUp(self):
        super().setUp()
        super().set_up("https://starwars.fandom.com/pt/wiki/Teste?veaction=edit")

    def test_icp_full_flow(self):
        self.support.wait_for_ve()
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Criando um novo artigo"
        )

        self.support.skip_step_0()
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 2: Universo")

        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 3: Infobox")
        self.driver.find_element_by_tag_name("aside")
        self.driver.find_element_by_css_selector("aside textarea")

        self.support.skip_step_2()
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 4: Fontes e Aparições")
        self.driver.find_element_by_id("wookieePage")

        self.support.skip_step_3()
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 5: Categorias")
        self.assertEqual(len(self.driver.find_elements_by_css_selector("#blackout_CuratedContentToolModal section p")), 2)

        self.support.skip_step_4()
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_class_name("oo-ui-processDialog-location")
        )
        time.sleep(2)
        categories_insertion_modal = self.driver.find_element_by_class_name("oo-ui-window-frame")
        self.assertTrue(categories_insertion_modal.is_displayed())
        time.sleep(2)

        with self.assertRaises(NoSuchElementException):
            self.driver.find_element_by_id("blackout_CuratedContentToolModal")

        self.driver.find_element_by_css_selector("div.oo-ui-processDialog-actions-primary .oo-ui-buttonElement-button").click()
        time.sleep(2)

        self.driver.find_element_by_id("title-eraicons")
        self.driver.find_element_by_css_selector(".WikiaArticle aside.portable-infobox")
        self.assertEqual(self.driver.find_elements_by_css_selector(".WikiaArticle h2")[1].text, "Notas e referências")

    def test_add_categories(self):
        self.support.wait_for_ve()
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Criando um novo artigo"
        )

        self.support.skip_step_0()

        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()

        self.support.skip_step_2()

        self.support.skip_step_3()

        self.support.skip_step_4()
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_class_name("oo-ui-processDialog-location")
        )
        time.sleep(0.5)
        self.driver.find_element_by_css_selector(".ve-ui-mwCategoryInputWidget input").send_keys("Machos")
        self.driver.find_element_by_css_selector(".ve-ui-mwCategoryInputWidget input").send_keys('')
        time.sleep(2)
        self.driver.find_element_by_css_selector(".ve-ui-mwCategoryInputWidget input").send_keys('')
        time.sleep(2)
        self.driver.find_element_by_css_selector(".ve-ui-mwCategoryInputWidget input").send_keys(Keys.ENTER)
        time.sleep(2)

        self.driver.find_element_by_css_selector("div.oo-ui-processDialog-actions-primary .oo-ui-buttonElement-button").click()
        time.sleep(2)
        self.driver.find_element_by_css_selector(".ve-ui-summaryPanel-showChangesButton a").click()
        time.sleep(3)
        wikitext = self.driver.find_element_by_css_selector(".ve-ui-mwSaveDialog-viewer pre").text
        self.assertTrue(wikitext.endswith("[[Categoria:Machos]]"))

    def test_cancel_categories(self):
        self.support.wait_for_ve()
        self.support.wait_for_icp()

        self.support.skip_step_0()

        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()

        self.support.skip_step_2()

        self.support.skip_step_3()

        self.support.skip_step_4()
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_class_name("oo-ui-processDialog-location")
        )
        time.sleep(2)

        self.driver.find_element_by_css_selector("div.oo-ui-processDialog-actions-safe .oo-ui-buttonElement-button").click()

        time.sleep(2)
        self.driver.find_element_by_id("title-eraicons")
        self.driver.find_element_by_css_selector(".WikiaArticle aside.portable-infobox")
        self.assertEqual(self.driver.find_elements_by_css_selector(".WikiaArticle h2")[1].text, "Notas e referências")
    
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
