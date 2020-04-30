import os
from unittest import TestCase

from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select, WebDriverWait


class ICPTestSuite(TestCase):
    
    @classmethod
    def setUpClass(cls):
        chromedriver_path = os.path.join(os.getcwd(), 'chromedriver')
        cls.driver = webdriver.Chrome(executable_path=chromedriver_path)

    @classmethod
    def tearDownClass(cls):
        Support(cls.driver).treat_eventual_alert()
        cls.driver.close()


class Support():

    def __init__(self, driver):
        self.driver = driver
    
    def get_legends_article(self):
        self.driver.get("https://starwars.fandom.com/pt/wiki/Legends:Teste?action=edit&useeditor=source")
    
    def skip_step_0(self):
        self.driver.find_element_by_css_selector(
            "#NovaPaginaTipoDeArtigo td[data-tipo='Personagem infobox']").click()

    def skip_step_1(self):
        self.driver.find_element_by_css_selector("button[data-resp]").click()

    def skip_step_2(self):
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal button").click()

    def skip_step_3(self):
        self.driver.find_element_by_css_selector("button[data-nope='true']").click()

    def skip_step_4(self):
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal button").click()

    def wait_for_step_2_ready(self):
        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Passo 2: Infobox"
        )

    def wait_for_all_infoboxes_ready(self):
        WebDriverWait(self.driver, 5).until(
            lambda d: len(d.find_elements_by_css_selector("#blackout_CuratedContentToolModal select option")) > 1
        )

    def wait_for_infobox_type_gathering(self):
        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text != "Criando um novo artigo"
        )

    def wait_for_wookiee_response(self):
        WebDriverWait(self.driver, 10).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Passo 4: Categorias"
        )
    
    def get_source_textarea_value(self):
        return self.driver.find_element_by_id("wpTextbox1").get_attribute('value')

    def get_infobox_textareas(self):
        return self.driver.find_elements_by_css_selector("aside textarea")
    
    def choose_outros_step_0(self):
        self.driver.find_element_by_css_selector(
            "#NovaPaginaTipoDeArtigo td[data-tipo='outro']").click()
    
    def choose_infobox(self, infobox_name):
        self.choose_outros_step_0()
        self.wait_for_all_infoboxes_ready()
        Select(self.driver.find_element_by_css_selector(
            "#blackout_CuratedContentToolModal select")).select_by_value(infobox_name)
        self.driver.find_element_by_css_selector("button[data-resp='s']").click()

    def select_written_text(self):
        ActionChains(self.driver).key_down(Keys.LEFT_SHIFT).send_keys(Keys.HOME).key_up(Keys.LEFT_SHIFT).perform()

    def treat_eventual_alert(self):
        try:
            self.driver.switch_to.alert.accept()
        except:
            pass
