import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";

import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Index";
import VehicleList from "./pages/vehicles/VehicleList";
import VehicleNew from "./pages/vehicles/VehicleNew";
import VehicleDetail from "./pages/vehicles/VehicleDetail";
import SalesList from "./pages/sales/SalesList";
import SalePage from "./pages/sales/SalePage";
import HistoryList from "./pages/history/HistoryList";
import SuppliersList from "./pages/masters/SuppliersList";
import InsurersList from "./pages/masters/InsurersList";
import UsersList from "./pages/masters/UsersList";
import StatusPage from "./pages/status/StatusPage";
import FeaturesInventory from "./pages/status/FeaturesInventory";
import ModuleRequestsList from "./pages/modules/ModuleRequestsList";
import ClientList from "./pages/clients/ClientList";
import ClientDetail from "./pages/clients/ClientDetail";
import InvoiceList from "./pages/invoices/InvoiceList";
import InvoiceDetail from "./pages/invoices/InvoiceDetail";
import IgicBook from "./pages/invoices/IgicBook";
import InvoiceSeriesSettings from "./pages/settings/InvoiceSeriesSettings";
import CompanySettingsPage from "./pages/settings/CompanySettingsPage";
import MyProfilePage from "./pages/settings/MyProfilePage";
import VehicleMastersPage from "./pages/settings/VehicleMastersPage";
import AcquisitionChannelsPage from "./pages/settings/AcquisitionChannelsPage";
import BranchesPage from "./pages/settings/BranchesPage";
import ReservationList from "./pages/reservations/ReservationList";
import ReservationDetail from "./pages/reservations/ReservationDetail";
import TreasuryPage from "./pages/treasury/TreasuryPage";
import OperatingExpensesPage from "./pages/treasury/OperatingExpensesPage";
import BankReconciliationPage from "./pages/treasury/BankReconciliationPage";
import CashRegisterPage from "./pages/treasury/CashRegisterPage";
import CashCategoriesPage from "./pages/treasury/CashCategoriesPage";
import AccountingPage from "./pages/accounting/AccountingPage";
import JournalEntryDetail from "./pages/accounting/JournalEntryDetail";
import LedgerPage from "./pages/accounting/LedgerPage";
import AccountingSummaryPage from "./pages/accounting/AccountingSummaryPage";
import ProfitLossPage from "./pages/accounting/ProfitLossPage";
import BalanceSheetPage from "./pages/accounting/BalanceSheetPage";
import TaxModelsPage from "./pages/accounting/TaxModelsPage";
import TaxModelDetailPage from "./pages/accounting/TaxModelDetailPage";
import VehicleMarginReport from "./pages/vehicles/VehicleMarginReport";
import TransfersPendingPage from "./pages/transfers/TransfersPendingPage";
import CommercialDashboard from "./pages/commercial/CommercialDashboard";
import ActivityList from "./pages/commercial/ActivityList";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DemandList from "./pages/demands/DemandList";
import DemandDetailPage from "./pages/demands/DemandDetailPage";
import FinancingEntitiesPage from "./pages/settings/financing/FinancingEntitiesPage";
import FinancingProductsPage from "./pages/settings/financing/FinancingProductsPage";
import FinancingModelsPage from "./pages/settings/financing/FinancingModelsPage";
import ImageGeneratorPage from "./pages/marketing/ImageGeneratorPage";
import PublicationsPage from "./pages/marketing/PublicationsPage";
import EmailCampaignsPage from "./pages/marketing/EmailCampaignsPage";
import NotFound from "./pages/NotFound";
import PurchaseList from "./pages/purchases/PurchaseList";
import PurchaseDetail from "./pages/purchases/PurchaseDetail";
import PostventaDashboardPage from "./pages/postventa/PostventaDashboardPage";
import FollowupsPage from "./pages/postventa/FollowupsPage";
import IncidentsPage from "./pages/postventa/IncidentsPage";
import WarrantiesPage from "./pages/postventa/WarrantiesPage";
import RepairsPage from "./pages/postventa/RepairsPage";
import ReviewsPage from "./pages/postventa/ReviewsPage";
import ClaimsPage from "./pages/postventa/ClaimsPage";
import FinanceIncidentsPage from "./pages/postventa/FinanceIncidentsPage";
import CostsPage from "./pages/postventa/CostsPage";
import StatsPage from "./pages/postventa/StatsPage";
import TasksPage from "./pages/tasks/TasksPage";
import SellerCockpit from "./pages/incentives/SellerCockpit";
import ManagementDashboard from "./pages/incentives/ManagementDashboard";
import ObjectivesConfigPage from "./pages/settings/ObjectivesConfigPage";
import IncentiveTiersPage from "./pages/settings/IncentiveTiersPage";
import CommercialLevelsPage from "./pages/settings/CommercialLevelsPage";
import FinanceRappelsPage from "./pages/settings/FinanceRappelsPage";
import CommercialIntelligencePage from "./pages/incentives/CommercialIntelligencePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vehicles" element={<VehicleList />} />
              <Route path="/vehicles/new" element={<VehicleNew />} />
              <Route path="/smart-documents" element={<Navigate to="/vehicles/new" replace />} />
              <Route path="/vehicles/margin-report" element={<VehicleMarginReport />} />
              <Route path="/vehicles/:id" element={<VehicleDetail />} />
              <Route path="/transfers" element={<TransfersPendingPage />} />
              <Route path="/purchases" element={<PurchaseList />} />
              <Route path="/purchases/:id" element={<PurchaseDetail />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/commercial" element={<CommercialDashboard />} />
              <Route path="/commercial/activities" element={<ActivityList />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/incentives" element={<SellerCockpit />} />
              <Route path="/management" element={<ManagementDashboard />} />
              <Route path="/incentives/management" element={<Navigate to="/management" replace />} />
              <Route path="/incentives/intelligence" element={<CommercialIntelligencePage />} />
              <Route path="/postventa" element={<PostventaDashboardPage />} />
              <Route path="/postventa/followups" element={<FollowupsPage />} />
              <Route path="/postventa/incidents" element={<IncidentsPage />} />
              <Route path="/postventa/warranties" element={<WarrantiesPage />} />
              <Route path="/postventa/repairs" element={<RepairsPage />} />
              <Route path="/postventa/reviews" element={<ReviewsPage />} />
              <Route path="/postventa/claims" element={<ClaimsPage />} />
              <Route path="/postventa/finance-incidents" element={<FinanceIncidentsPage />} />
              <Route path="/postventa/costs" element={<CostsPage />} />
              <Route path="/postventa/stats" element={<StatsPage />} />
              <Route path="/marketing/images" element={<ImageGeneratorPage />} />
              <Route path="/marketing/publications" element={<PublicationsPage />} />
              <Route path="/marketing/emails" element={<EmailCampaignsPage />} />
              <Route path="/demands" element={<DemandList />} />
              <Route path="/demands/:id" element={<DemandDetailPage />} />
              <Route path="/sales" element={<SalesList />} />
              <Route path="/sales/new" element={<SalePage />} />
              <Route path="/clients" element={<ClientList />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/reservations" element={<ReservationList />} />
              <Route path="/reservations/:id" element={<ReservationDetail />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/igic-book" element={<IgicBook />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/history" element={<HistoryList />} />
              <Route path="/treasury" element={<TreasuryPage />} />
              <Route path="/operating-expenses" element={<OperatingExpensesPage />} />
              <Route path="/bank-reconciliation" element={<BankReconciliationPage />} />
              <Route path="/cash-register" element={<CashRegisterPage />} />
              <Route path="/cash-categories" element={<CashCategoriesPage />} />
              <Route path="/accounting" element={<AccountingPage />} />
              <Route path="/accounting/:id" element={<JournalEntryDetail />} />
              <Route path="/accounting/ledger" element={<LedgerPage />} />
              <Route path="/accounting/summary" element={<AccountingSummaryPage />} />
              <Route path="/accounting/profit-loss" element={<ProfitLossPage />} />
              <Route path="/accounting/balance" element={<BalanceSheetPage />} />
              <Route path="/accounting/taxes" element={<TaxModelsPage />} />
              <Route path="/accounting/taxes/:modelCode" element={<TaxModelDetailPage />} />
              <Route path="/masters/suppliers" element={<SuppliersList />} />
              <Route path="/masters/insurers" element={<InsurersList />} />
              <Route path="/settings/users" element={<UsersList />} />
              <Route path="/settings/invoice-series" element={<InvoiceSeriesSettings />} />
              <Route path="/settings/company" element={<CompanySettingsPage />} />
              <Route path="/settings/vehicle-masters" element={<VehicleMastersPage />} />
              <Route path="/settings/acquisition-channels" element={<AcquisitionChannelsPage />} />
              <Route path="/settings/branches" element={<BranchesPage />} />
              <Route path="/settings/financing" element={<FinancingEntitiesPage />} />
              <Route path="/settings/financing/productos" element={<FinancingProductsPage />} />
              <Route path="/settings/financing/modelos" element={<FinancingModelsPage />} />
              <Route path="/settings/profile" element={<MyProfilePage />} />
              <Route path="/settings/incentives" element={<ObjectivesConfigPage />} />
              <Route path="/settings/incentive-tiers" element={<IncentiveTiersPage />} />
              <Route path="/settings/commercial-levels" element={<CommercialLevelsPage />} />
              <Route path="/settings/finance-rappels" element={<FinanceRappelsPage />} />
              <Route path="/modules" element={<ModuleRequestsList />} />
              <Route path="/features" element={<FeaturesInventory />} />
              <Route path="/status" element={<StatusPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
