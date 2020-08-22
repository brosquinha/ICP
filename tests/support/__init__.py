import os
import re
from time import sleep
from unittest import TestCase

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select, WebDriverWait


class ICPTestSuite(TestCase):
    
    @classmethod
    def setUpClass(cls):
        chromedriver_path = os.path.join(os.getcwd(), 'chromedriver')
        cls.driver = webdriver.Chrome(executable_path=chromedriver_path)
        cls.support = Support(cls.driver)
        with open('ICP.js') as f:
            cls.support.icp_content = f.read()
        with open('SWWICP.js') as f:
            cls.support.swwicp_content = f.read()

    def setUp(self):
        pass

    def set_up(self, url):
        self.driver.implicitly_wait(3)
        self.support.get_url(url)
        self.support.clear_localstorage()

    @classmethod
    def tearDownClass(cls):
        Support(cls.driver).treat_eventual_alert()
        cls.driver.close()


class Support():

    def __init__(self, driver):
        self.driver = driver
    
    def get_new_icp_version(self):
        return re.findall(r"var ICPversion = \'(.*)\'\;", self.icp_content)[0]
    
    def wait_for_icp(self):
        WebDriverWait(self.driver, 5).until(
            lambda d: len(d.find_elements_by_css_selector("#blackout_CuratedContentToolModal")) > 0
        )
    
    def load_new_icp(self):
        self.driver.execute_script(self.icp_content)
        sleep(0.2)
        self.driver.execute_script(self.swwicp_content)
    
    def wait_for_new_icp(self):
        sleep(0.2)
        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_element_by_css_selector("#ICPVersion").get_attribute('textContent') == self.get_new_icp_version()
        )

    def wait_for_ve(self):
        try:
            WebDriverWait(self.driver, 5).until(
                lambda d: d.execute_script("return window.ve && ve.init && ve.init.target && ve.init.target.active")
            )
        except TimeoutException:
            self.driver.refresh()
    
    def wait_for_old_ve(self):
        WebDriverWait(self.driver, 15).until(
            lambda d: d.find_element_by_class_name("ve-ui-wikia-anon-warning")
        )
    
    def get_url(self, url):
        self.driver.get(url)
        self.wait_for_ve()
        self.wait_for_icp()
        self.load_new_icp()
        self.wait_for_new_icp()
    
    def get_legends_article(self):
        self.get_url("https://starwars.fandom.com/pt/wiki/Legends:Teste?action=edit&useeditor=source")

    def clear_localstorage(self):
        self.driver.execute_script('localStorage.clear(); sessionStorage.clear()')
    
    def skip_step_0(self):
        self.driver.find_element_by_css_selector(
            "#ICPNewArticleGrid div[data-tipo='Personagem infobox']").click()

    def skip_step_1(self):
        sleep(0.5)
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal section button").click()

    def skip_step_2(self):
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal button").click()

    def skip_step_3(self):
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal section button:nth-of-type(3)").click()

    def skip_step_4(self):
        sleep(0.1)
        self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal button").click()

    def wait_for_step_2_ready(self):
        WebDriverWait(self.driver, 5).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Passo 3: Infobox"
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
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Passo 5: Categorias"
        )
    
    def get_source_textarea_value(self):
        return self.driver.find_element_by_id("wpTextbox1").get_attribute('value')

    def get_ve_wikitext(self):
        return self.driver.find_element_by_css_selector(".ve-ce-rootNode").text

    def get_infobox_textareas(self):
        return self.driver.find_elements_by_css_selector("aside textarea")

    def get_modal_title(self):
        return self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
    
    def choose_outros_step_0(self):
        self.driver.find_element_by_css_selector(
            "#ICPNewArticleGrid div[data-tipo='outro']").click()
    
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
