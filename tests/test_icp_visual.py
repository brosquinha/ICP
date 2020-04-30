import time

from tests.support import ICPTestSuite, Support

from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select, WebDriverWait

class TestICPVisual(ICPTestSuite):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

    def setUp(self):
        self.driver.implicitly_wait(3)
        self.driver.get("https://starwars.fandom.com/pt/wiki/Teste?veaction=edit")
        self.support = Support(self.driver)

    def test_icp_full_flow(self):
        WebDriverWait(self.driver, 15).until(
            lambda d: d.find_element_by_class_name("ve-ui-wikia-anon-warning")
        )
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Criando um novo artigo"
        )

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
        self.assertEqual(len(self.driver.find_elements_by_css_selector("#blackout_CuratedContentToolModal section p")), 3)

        self.support.skip_step_4()
        icp_div = self.driver.find_element_by_id("blackout_CuratedContentToolModal")
        categories_insertion_menu = self.driver.find_element_by_css_selector(
            ".oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup.oo-ui-popupToolGroup-active.oo-ui-popupToolGroup-left")
        self.assertTrue(categories_insertion_menu.is_displayed())
        categories_insertion_button = categories_insertion_menu.find_element_by_class_name(
            "oo-ui-tool-name-categories")
        self.assertIn("1px solid", categories_insertion_button.value_of_css_property("border"))
        # self.assertFalse(icp_div.is_displayed()) TODO bug: modal actually is not hidden, just z-indexed to -1

        categories_insertion_button.click()
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_class_name("oo-ui-processDialog-location")
        )
        categories_insertion_modal = self.driver.find_element_by_class_name("oo-ui-window-frame")
        self.assertTrue(categories_insertion_modal.is_displayed())
        time.sleep(2)

        self.driver.find_element_by_css_selector("div.oo-ui-processDialog-actions-primary .oo-ui-buttonElement-button").click()
        alert = self.driver.switch_to.alert
        alert.dismiss()
        self.assertTrue(categories_insertion_menu.is_displayed())
        self.assertNotIn("1px solid", categories_insertion_button.value_of_css_property("border"))
        source_editor_button = categories_insertion_menu.find_element_by_class_name(
            "oo-ui-tool-name-wikiaSourceMode")
        self.assertIn("1px solid", source_editor_button.value_of_css_property("border"))

        source_editor_button.click()
        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_element_by_css_selector("textarea.ui-autocomplete-input")
        )
        WebDriverWait(self.driver, 10).until_not(
            lambda d: d.find_element_by_css_selector("textarea.ui-autocomplete-input")
        )
        self.driver.find_element_by_id("title-eraicons")
        self.driver.find_element_by_css_selector("#WikiaArticle aside.portable-infobox")
        self.assertEqual(self.driver.find_elements_by_css_selector("#WikiaArticle h2")[1].text, "Notas e referências")

    def test_add_categories(self):
        WebDriverWait(self.driver, 15).until(
            lambda d: d.find_element_by_class_name("ve-ui-wikia-anon-warning")
        )
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Criando um novo artigo"
        )

        self.support.skip_step_0()

        self.support.skip_step_1()
        self.support.wait_for_step_2_ready()

        self.support.skip_step_2()

        self.support.skip_step_3()

        self.support.skip_step_4()
        categories_insertion_menu = self.driver.find_element_by_css_selector(
            ".oo-ui-widget.oo-ui-widget-enabled.oo-ui-toolGroup.oo-ui-iconElement.oo-ui-indicatorElement.oo-ui-popupToolGroup.oo-ui-listToolGroup.oo-ui-popupToolGroup-active.oo-ui-popupToolGroup-left")
        categories_insertion_button = categories_insertion_menu.find_element_by_class_name(
            "oo-ui-tool-name-categories").click()
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
        alert = self.driver.switch_to.alert
        alert.dismiss()
        categories_insertion_menu.find_element_by_class_name("oo-ui-tool-name-wikiaSourceMode").click()
        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_element_by_css_selector("textarea.ui-autocomplete-input")
        )
        WebDriverWait(self.driver, 10).until_not(
            lambda d: d.find_element_by_css_selector("textarea.ui-autocomplete-input")
        )
        self.driver.find_element_by_css_selector(".ve-init-mw-viewPageTarget-toolbar-actions a[accesskey='s']").click()
        time.sleep(1)
        self.driver.find_element_by_css_selector(".oo-ui-processDialog-actions-other .oo-ui-buttonElement-button.secondary").click()
        time.sleep(1)
        wikitext = self.driver.find_element_by_css_selector(".ve-ui-mwSaveDialog-viewer pre").text
        self.assertTrue(wikitext.endswith("[[Categoria:Machos]]"))
    
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
