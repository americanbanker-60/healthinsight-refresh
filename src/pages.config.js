import Dashboard from './pages/Dashboard';
import AnalyzeNewsletter from './pages/AnalyzeNewsletter';
import NewsletterDetail from './pages/NewsletterDetail';
import DashboardSettings from './pages/DashboardSettings';
import SourcePage from './pages/SourcePage';
import Cleanup from './pages/Cleanup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "AnalyzeNewsletter": AnalyzeNewsletter,
    "NewsletterDetail": NewsletterDetail,
    "DashboardSettings": DashboardSettings,
    "SourcePage": SourcePage,
    "Cleanup": Cleanup,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};