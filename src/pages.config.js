/**
 * pages.config.js - Page routing configuration
 */
import AIContentGenerator from './pages/AIContentGenerator';
import AdminDashboard from './pages/AdminDashboard';
import CompaniesDirectory from './pages/CompaniesDirectory';
import CompanyPage from './pages/CompanyPage';
import CustomPackDetail from './pages/CustomPackDetail';
import Dashboard from './pages/Dashboard';
import DashboardSettings from './pages/DashboardSettings';
import DeepDiveResults from './pages/DeepDiveResults';
import DevSuperAgent from './pages/DevSuperAgent';
import ExploreAllSources from './pages/ExploreAllSources';
import KnowledgeHub from './pages/KnowledgeHub';
import LandingPage from './pages/LandingPage';
import MyCustomPacks from './pages/MyCustomPacks';
import MyLibrary from './pages/MyLibrary';
import NewsletterDetail from './pages/NewsletterDetail';
import PEMeetingPrep from './pages/PEMeetingPrep';
import ResearchAssistant from './pages/ResearchAssistant';
import SourcePage from './pages/SourcePage';
import SystemDocumentation from './pages/SystemDocumentation';
import TopicPage from './pages/TopicPage';
import UserSettings from './pages/UserSettings';
import VariousSources from './pages/VariousSources';
import __Layout from './Layout.jsx';

export const PAGES = {
    "AIContentGenerator": AIContentGenerator,
    "AdminDashboard": AdminDashboard,
    "CompaniesDirectory": CompaniesDirectory,
    "CompanyPage": CompanyPage,
    "CustomPackDetail": CustomPackDetail,
    "Dashboard": Dashboard,
    "DashboardSettings": DashboardSettings,
    "DeepDiveResults": DeepDiveResults,
    "DevSuperAgent": DevSuperAgent,
    "ExploreAllSources": ExploreAllSources,
    "KnowledgeHub": KnowledgeHub,
    "LandingPage": LandingPage,
    "MyCustomPacks": MyCustomPacks,
    "MyLibrary": MyLibrary,
    "NewsletterDetail": NewsletterDetail,
    "PEMeetingPrep": PEMeetingPrep,
    "ResearchAssistant": ResearchAssistant,
    "SourcePage": SourcePage,
    "SystemDocumentation": SystemDocumentation,
    "TopicPage": TopicPage,
    "UserSettings": UserSettings,
    "VariousSources": VariousSources,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};