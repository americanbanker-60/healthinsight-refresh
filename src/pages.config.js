/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIContentGenerator from './pages/AIContentGenerator';
import AdminDashboard from './pages/AdminDashboard';
import AgentWorkspace from './pages/AgentWorkspace';
import AnalyzeNewsletter from './pages/AnalyzeNewsletter';
import CompaniesDirectory from './pages/CompaniesDirectory';
import CompanyPage from './pages/CompanyPage';
import CustomPackDetail from './pages/CustomPackDetail';
import Dashboard from './pages/Dashboard';
import DashboardSettings from './pages/DashboardSettings';
import DeepDiveResults from './pages/DeepDiveResults';
import ExploreAllSources from './pages/ExploreAllSources';
import KnowledgeHub from './pages/KnowledgeHub';
import ManageSources from './pages/ManageSources';
import MyCustomPacks from './pages/MyCustomPacks';
import MyLibrary from './pages/MyLibrary';
import NewsletterDetail from './pages/NewsletterDetail';
import PEMeetingPrep from './pages/PEMeetingPrep';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SourcePage from './pages/SourcePage';
import SystemDocumentation from './pages/SystemDocumentation';
import TermsOfService from './pages/TermsOfService';
import TopicPage from './pages/TopicPage';
import TopicsDirectory from './pages/TopicsDirectory';
import Unauthorized from './pages/Unauthorized';
import UserSettings from './pages/UserSettings';
import VariousSources from './pages/VariousSources';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIContentGenerator": AIContentGenerator,
    "AdminDashboard": AdminDashboard,
    "AgentWorkspace": AgentWorkspace,
    "AnalyzeNewsletter": AnalyzeNewsletter,
    "CompaniesDirectory": CompaniesDirectory,
    "CompanyPage": CompanyPage,
    "CustomPackDetail": CustomPackDetail,
    "Dashboard": Dashboard,
    "DashboardSettings": DashboardSettings,
    "DeepDiveResults": DeepDiveResults,
    "ExploreAllSources": ExploreAllSources,
    "KnowledgeHub": KnowledgeHub,
    "ManageSources": ManageSources,
    "MyCustomPacks": MyCustomPacks,
    "MyLibrary": MyLibrary,
    "NewsletterDetail": NewsletterDetail,
    "PEMeetingPrep": PEMeetingPrep,
    "PrivacyPolicy": PrivacyPolicy,
    "SourcePage": SourcePage,
    "SystemDocumentation": SystemDocumentation,
    "TermsOfService": TermsOfService,
    "TopicPage": TopicPage,
    "TopicsDirectory": TopicsDirectory,
    "Unauthorized": Unauthorized,
    "UserSettings": UserSettings,
    "VariousSources": VariousSources,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};