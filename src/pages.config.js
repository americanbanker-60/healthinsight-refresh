import BulkImportMonitor from './pages/BulkImportMonitor';
import AdminDashboard from './pages/AdminDashboard';
import CompanyPage from './pages/CompanyPage';
import CustomPackDetail from './pages/CustomPackDetail';
import Dashboard from './pages/Dashboard';
import DashboardSettings from './pages/DashboardSettings';
import DeepDiveResults from './pages/DeepDiveResults';
import DevSuperAgent from './pages/DevSuperAgent';
import ExploreAllSources from './pages/ExploreAllSources';
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
import ManageSources from './pages/ManageSources';
import BDOpportunities from './pages/BDOpportunities';
import __Layout from './Layout.jsx';

export const PAGES = {
    "BulkImportMonitor": BulkImportMonitor,
    "AdminDashboard": AdminDashboard,
    "CompanyPage": CompanyPage,
    "CustomPackDetail": CustomPackDetail,
    "Dashboard": Dashboard,
    "DashboardSettings": DashboardSettings,
    "DeepDiveResults": DeepDiveResults,
    "DevSuperAgent": DevSuperAgent,
    "ExploreAllSources": ExploreAllSources,
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
    "ManageSources": ManageSources,
    "BDOpportunities": BDOpportunities,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};