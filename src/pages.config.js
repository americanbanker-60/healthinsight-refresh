import Dashboard from './pages/Dashboard';
import AnalyzeNewsletter from './pages/AnalyzeNewsletter';
import NewsletterDetail from './pages/NewsletterDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "AnalyzeNewsletter": AnalyzeNewsletter,
    "NewsletterDetail": NewsletterDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};