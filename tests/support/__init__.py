import os
import re
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
        with open('ICP.js') as f:
            cls.icp_content = f.read()
        with open('SWWICP.js') as f:
            cls.icp_content += f.read()

    def setUp(self):
        self.support = Support(self.driver)

    def set_up(self, url):
        self.driver.implicitly_wait(3)
        self.driver.get(url)
        self.support.wait_for_icp()
        self.driver.execute_script(self.icp_content)
        self.support.wait_for_new_icp(self.icp_content)

    @classmethod
    def tearDownClass(cls):
        Support(cls.driver).treat_eventual_alert()
        cls.driver.close()


class Support():

    def __init__(self, driver):
        self.driver = driver
    
    def get_new_icp_version(self, icp_content):
        return re.findall(r"var ICPversion = \'(.*)\'\;", icp_content)[0]
    
    def wait_for_icp(self):
        WebDriverWait(self.driver, 5).until(
            lambda d: len(d.find_elements_by_css_selector("#blackout_CuratedContentToolModal")) > 0
        )
    
    def wait_for_new_icp(self, icp_content):
        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_element_by_css_selector("#ICPVersion").get_attribute('textContent') == self.get_new_icp_version(icp_content)
        )
    
    def get_legends_article(self, icp_content):
        self.driver.get("https://starwars.fandom.com/pt/wiki/Legends:Teste?action=edit&useeditor=source")
        self.wait_for_icp()
        self.driver.execute_script(icp_content)
        self.wait_for_new_icp(icp_content)
    
    def skip_step_0(self):
        self.driver.find_element_by_css_selector(
            "#NovaPaginaTipoDeArtigo div[data-tipo='Personagem infobox']").click()

    def skip_step_1(self):
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal section button").click()

    def skip_step_2(self):
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal button").click()

    def skip_step_3(self):
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal section button:nth-of-type(3)").click()

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

    def get_modal_title(self):
        return self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
    
    def choose_outros_step_0(self):
        self.driver.find_element_by_css_selector(
            "#NovaPaginaTipoDeArtigo div[data-tipo='outro']").click()
    
    def choose_infobox(self, infobox_name):
        self.choose_outros_step_0()
        self.wait_for_all_infoboxes_ready()
        Select(self.driver.find_element_by_css_selector(
            "#blackout_CuratedContentToolModal select")).select_by_value(infobox_name)
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal section button").click()

    def choose_wookiee_article(self, pagename):
        self.driver.find_element_by_id("wookieePage").send_keys("")
        self.select_written_text()
        self.driver.find_element_by_id("wookieePage").send_keys(pagename)
        self.driver.find_element_by_css_selector("section button").click()
    
    def return_to_step(self, step_number):
        self.driver.find_element_by_css_selector("#CuratedContentToolModal nav ol li:nth-of-type(%d)" % step_number).click()

    def select_written_text(self):
        ActionChains(self.driver).key_down(Keys.LEFT_SHIFT).send_keys(Keys.HOME).key_up(Keys.LEFT_SHIFT).perform()

    def treat_eventual_alert(self):
        try:
            self.driver.switch_to.alert.accept()
        except:
            pass
