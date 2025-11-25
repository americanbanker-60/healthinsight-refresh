import Dashboard from './pages/Dashboard';
import AnalyzeNewsletter from './pages/AnalyzeNewsletter';
import NewsletterDetail from './pages/NewsletterDetail';
import DashboardSettings from './pages/DashboardSettings';
import SourcePage from './pages/SourcePage';
import Cleanup from './pages/Cleanup';
import ManageSources from './pages/ManageSources';
import LearningPacks from './pages/LearningPacks';
import MyLibrary from './pages/MyLibrary';
import KnowledgeHub from './pages/KnowledgeHub';
import TopicPage from './pages/TopicPage';
import TopicsDirectory from './pages/TopicsDirectory';
import CompanyPage from './pages/CompanyPage';
import CompaniesDirectory from './pages/CompaniesDirectory';
import MyCustomPacks from './pages/MyCustomPacks';
import CustomPackDetail from './pages/CustomPackDetail';
import DeepDiveResults from './pages/DeepDiveResults';
import UserSettings from './pages/UserSettings';
import LandingRouter from './pages/LandingRouter';
import ManageLearningPacks from './pages/ManageLearningPacks';
import AdminDashboard from './pages/AdminDashboard';
import PublicationDateMigration from './pages/PublicationDateMigration';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "AnalyzeNewsletter": AnalyzeNewsletter,
    "NewsletterDetail": NewsletterDetail,
    "DashboardSettings": DashboardSettings,
    "SourcePage": SourcePage,
    "Cleanup": Cleanup,
    "ManageSources": ManageSources,
    "LearningPacks": LearningPacks,
    "MyLibrary": MyLibrary,
    "KnowledgeHub": KnowledgeHub,
    "TopicPage": TopicPage,
    "TopicsDirectory": TopicsDirectory,
    "CompanyPage": CompanyPage,
    "CompaniesDirectory": CompaniesDirectory,
    "MyCustomPacks": MyCustomPacks,
    "CustomPackDetail": CustomPackDetail,
    "DeepDiveResults": DeepDiveResults,
    "UserSettings": UserSettings,
    "LandingRouter": LandingRouter,
    "ManageLearningPacks": ManageLearningPacks,
    "AdminDashboard": AdminDashboard,
    "PublicationDateMigration": PublicationDateMigration,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};