import Cleanup from './pages/Cleanup';
import CustomPackDetail from './pages/CustomPackDetail';
import DashboardSettings from './pages/DashboardSettings';
import PublicationDateMigration from './pages/PublicationDateMigration';
import Unauthorized from './pages/Unauthorized';
import UserSettings from './pages/UserSettings';
import VariousSources from './pages/VariousSources';
import AIContentGenerator from './pages/AIContentGenerator';
import AdminDashboard from './pages/AdminDashboard';
import AgentWorkspace from './pages/AgentWorkspace';
import CompaniesDirectory from './pages/CompaniesDirectory';
import CompanyPage from './pages/CompanyPage';
import Dashboard from './pages/Dashboard';
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
import TermsOfService from './pages/TermsOfService';
import TopicPage from './pages/TopicPage';
import TopicsDirectory from './pages/TopicsDirectory';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cleanup": Cleanup,
    "CustomPackDetail": CustomPackDetail,
    "DashboardSettings": DashboardSettings,
    "PublicationDateMigration": PublicationDateMigration,
    "Unauthorized": Unauthorized,
    "UserSettings": UserSettings,
    "VariousSources": VariousSources,
    "AIContentGenerator": AIContentGenerator,
    "AdminDashboard": AdminDashboard,
    "AgentWorkspace": AgentWorkspace,
    "CompaniesDirectory": CompaniesDirectory,
    "CompanyPage": CompanyPage,
    "Dashboard": Dashboard,
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
    "TermsOfService": TermsOfService,
    "TopicPage": TopicPage,
    "TopicsDirectory": TopicsDirectory,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};