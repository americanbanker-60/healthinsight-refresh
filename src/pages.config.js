import AIContentGenerator from './pages/AIContentGenerator';
import AdminDashboard from './pages/AdminDashboard';
import AgentWorkspace from './pages/AgentWorkspace';
import Cleanup from './pages/Cleanup';
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
import PublicationDateMigration from './pages/PublicationDateMigration';
import SourcePage from './pages/SourcePage';
import TermsOfService from './pages/TermsOfService';
import TopicPage from './pages/TopicPage';
import TopicsDirectory from './pages/TopicsDirectory';
import Unauthorized from './pages/Unauthorized';
import UserSettings from './pages/UserSettings';
import VariousSources from './pages/VariousSources';
import SystemDocumentation from './pages/SystemDocumentation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIContentGenerator": AIContentGenerator,
    "AdminDashboard": AdminDashboard,
    "AgentWorkspace": AgentWorkspace,
    "Cleanup": Cleanup,
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
    "PublicationDateMigration": PublicationDateMigration,
    "SourcePage": SourcePage,
    "TermsOfService": TermsOfService,
    "TopicPage": TopicPage,
    "TopicsDirectory": TopicsDirectory,
    "Unauthorized": Unauthorized,
    "UserSettings": UserSettings,
    "VariousSources": VariousSources,
    "SystemDocumentation": SystemDocumentation,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};