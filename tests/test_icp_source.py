import os
import unittest

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait


class TestICPSource(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        chromedriver_path = os.path.join(os.getcwd(), 'chromedriver')
        cls.driver = webdriver.Chrome(executable_path=chromedriver_path)
    
    def setUp(self):
        self.driver.implicitly_wait(3)
        self.driver.get("https://starwars.fandom.com/pt/wiki/Teste?action=edit&useeditor=source")

    # TODO actual tests:
    # Run through all steps with minimum interaction to test if ICP can go through all steps
    # Run Yes for Eras (in-universe-article) and check for generated wikitext for {{Eras|canon|legends}}
    # Run No for Eras (in-universe-article) and check for generated wikitext for {{Eras|canon}}
    # Run 3 tests, one for each possible Eras answer for out-of-universe article
    # Check if Personagens infobox type is corrected generated
    # Check for infobox step buttons functionallity
    # Fill in some parameters in an infobox and check generated wikitext
    # Check for Wookieepedia generated sections (also check for ICPDisclaimer)
    # Check if categories are correct?
    # Check for configs modal and effects
    
    def test_icp_opened(self):
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Criando um novo artigo")

    def test_loads_eras_after_article_type_selection(self):
        td = self.driver.find_element_by_css_selector("#NovaPaginaTipoDeArtigo td[data-tipo='Personagem infobox']")
        td.click()
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 1: Universo")

    def test_goes_to_infobox_step(self):
        td = self.driver.find_element_by_css_selector("#NovaPaginaTipoDeArtigo td[data-tipo='Personagem infobox']")
        td.click()
        button = self.driver.find_element_by_css_selector("button[data-resp='s']")
        button.click()
        WebDriverWait(self.driver, 3).until(
            lambda d: d.find_element_by_css_selector("#blackout_CuratedContentToolModal h3").text == "Passo 2: Infobox"
        )
        h3 = self.driver.find_element_by_css_selector("#blackout_CuratedContentToolModal h3")
        self.assertEqual(h3.text, "Passo 2: Infobox")
        self.driver.find_element_by_tag_name("aside")

    def tearDown(self):
        self.driver.refresh()

    @classmethod
    def tearDownClass(cls):
        cls.driver.close()
