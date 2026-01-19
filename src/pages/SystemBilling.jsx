import React, { useState, useEffect } from "react";
import { Payment } from "@/entities/Payment";
import { Cost } from "@/entities/Cost";
import { ProfitDistribution } from "@/entities/ProfitDistribution";
import { CashBalance } from "@/entities/CashBalance";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  PieChart,
  RefreshCw,
  CheckCircle2,
  Wallet,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { format, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function SystemBilling() {
  const [currentUser, setCurrentUser] = useState(null);
  const [payments, setPayments] = useState([]);
  const [costs, setCosts] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [cashBalance, setCashBalance] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });
  
  const [distributionData, setDistributionData] = useState([]);

  // Chart data
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const user = await User.me();
      setCurrentUser(user);

      if (user?.role !== 'admin') {
        showNotification('error', 'Acesso negado. Apenas administradores podem acessar esta página.');
        return;
      }

      const [paymentsList, costsList, distributionsList, adminList, balanceList] = await Promise.all([
        Payment.filter({ reference_month: selectedMonth, status: 'paid' }),
        Cost.filter({ reference_month: selectedMonth }),
        ProfitDistribution.filter({ reference_month: selectedMonth }),
        User.filter({ role: 'admin' }),
        CashBalance.filter({ reference_month: selectedMonth })
      ]);

      setPayments(paymentsList);
      setCosts(costsList);
      setDistributions(distributionsList);
      setAdminUsers(adminList);
      setCashBalance(balanceList.length > 0 ? balanceList[0] : null);

      // Load historical data for charts (last 12 months)
      await loadHistoricalData();

      // Initialize distribution data
      if (adminList.length > 0) {
        setDistributionData(adminList.map(admin => ({
          admin_id: admin.id,
          admin_name: admin.full_name,
          amount: 0
        })));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showNotification('error', 'Erro ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    try {
      const monthsToLoad = 12;
      const historicalData = [];
      
      // Carregar TODOS os dados desde o início
      const allPayments = await Payment.filter({ status: 'paid' });
      const allCosts = await Cost.list();
      const allDistributions = await ProfitDistribution.list();
      
      for (let i = monthsToLoad - 1; i >= 0; i--) {
        const date = subMonths(parseISO(selectedMonth + '-01'), i);
        const monthKey = format(date, 'yyyy-MM');
        
        // Filtrar até este mês (acumulado)
        const paymentsUpToMonth = allPayments.filter(p => p.reference_month <= monthKey);
        const costsUpToMonth = allCosts.filter(c => c.reference_month <= monthKey);
        const distributionsUpToMonth = allDistributions.filter(d => d.reference_month <= monthKey);

        // Calcular acumulados
        const accumulatedRevenue = paymentsUpToMonth.reduce((sum, p) => sum + (p.amount || 0), 0);
        const accumulatedCosts = costsUpToMonth.reduce((sum, c) => sum + (c.amount || 0), 0);
        const accumulatedDistributions = distributionsUpToMonth.reduce((sum, d) => 
          sum + (d.distributions || []).reduce((s, dist) => s + (dist.amount || 0), 0), 0
        );
        
        const accumulatedProfit = accumulatedRevenue;
        const accumulatedCash = accumulatedProfit - accumulatedCosts - accumulatedDistributions;

        historicalData.push({
          month: format(date, 'MMM/yy', { locale: ptBR }),
          monthKey,
          lucro: accumulatedProfit,
          custos: accumulatedCosts,
          distribuicoes: accumulatedDistributions,
          caixa: accumulatedCash,
        });
      }
      
      setMonthlyData(historicalData);
    } catch (error) {
      console.error("Erro ao carregar dados históricos:", error);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 5000);
  };

  const calculatePreviousMonthBalance = async () => {
    const prevMonth = format(subMonths(parseISO(selectedMonth + '-01'), 1), 'yyyy-MM');
    const prevBalances = await CashBalance.filter({ reference_month: prevMonth });
    return prevBalances.length > 0 ? prevBalances[0].closing_balance : 0;
  };

  // Helper functions
  const getCostTypeLabel = (type) => {
    const labels = {
      tool: 'Ferramentas',
      service: 'Serviços',
      infrastructure: 'Infraestrutura',
      license: 'Licenças',
      other: 'Outros'
    };
    return labels[type] || type;
  };

  // Calculations - ACUMULADOS até o mês selecionado
  const calculateAccumulated = async () => {
    const allPayments = await Payment.filter({ status: 'paid', reference_month: { '$lte': selectedMonth } });
    const allCosts = await Cost.filter({ reference_month: { '$lte': selectedMonth } });
    const allDistributions = await ProfitDistribution.filter({ reference_month: { '$lte': selectedMonth } });

    const accumulatedRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const accumulatedCosts = allCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
    const accumulatedDistributions = allDistributions.reduce((sum, d) => 
      sum + (d.distributions || []).reduce((s, dist) => s + (dist.amount || 0), 0), 0
    );

    return {
      revenue: accumulatedRevenue,
      costs: accumulatedCosts,
      distributions: accumulatedDistributions,
      cash: accumulatedRevenue - accumulatedCosts - accumulatedDistributions
    };
  };

  // Calculations for current month only
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCosts = costs.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalDistributed = distributions.reduce((sum, d) => 
    sum + (d.distributions || []).reduce((s, dist) => s + (dist.amount || 0), 0), 0
  );
  const monthProfit = totalRevenue - totalCosts;
  const openingBalance = cashBalance?.opening_balance || 0;
  const currentCashBalance = openingBalance + totalRevenue - totalCosts - totalDistributed;

  const handleOpenDistribution = () => {
    const updatedDistribution = distributionData.map(item => ({
      ...item,
      amount: 0
    }));
    setDistributionData(updatedDistribution);
    setShowDistributionModal(true);
  };

  const handleAmountChange = (adminId, amount) => {
    const newAmount = parseFloat(amount) || 0;
    setDistributionData(prev => prev.map(item => 
      item.admin_id === adminId 
        ? { ...item, amount: newAmount }
        : item
    ));
  };

  const handleSaveDistribution = async () => {
    try {
      const totalDistribution = distributionData.reduce((sum, item) => sum + item.amount, 0);
      
      if (totalDistribution > currentCashBalance) {
        showNotification('error', `O total distribuído (R$ ${totalDistribution.toFixed(2)}) não pode ser maior que o caixa disponível (R$ ${currentCashBalance.toFixed(2)})`);
        return;
      }

      const distributionRecord = {
        reference_month: selectedMonth,
        total_revenue: totalRevenue,
        total_costs: totalCosts,
        total_profit: monthProfit,
        distribution_date: format(new Date(), "yyyy-MM-dd"),
        distributions: distributionData.filter(d => d.amount > 0),
        status: 'completed',
        created_by: currentUser.id,
      };

      await ProfitDistribution.create(distributionRecord);
      showNotification('success', 'Distribuição salva com sucesso!');
      setShowDistributionModal(false);
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar distribuição:", error);
      showNotification('error', 'Erro ao salvar distribuição');
    }
  };

  const handleCloseMonth = async () => {
    if (!window.confirm('Deseja fechar o mês atual? Isso criará um registro de saldo para o próximo mês.')) {
      return;
    }

    try {
      const prevBalance = await calculatePreviousMonthBalance();
      
      const balanceData = {
        reference_month: selectedMonth,
        opening_balance: prevBalance,
        total_revenue: totalRevenue,
        total_costs: totalCosts,
        total_distributions: totalDistributed,
        closing_balance: currentCashBalance,
        created_by: currentUser.id,
      };

      await CashBalance.create(balanceData);
      showNotification('success', 'Mês fechado com sucesso! O saldo foi registrado.');
      await loadData();
    } catch (error) {
      console.error("Erro ao fechar mês:", error);
      showNotification('error', 'Erro ao fechar mês');
    }
  };

  // Prepare chart data
  const costCategoryData = costs.reduce((acc, cost) => {
    const type = cost.cost_type || 'other';
    if (!acc[type]) {
      acc[type] = { name: getCostTypeLabel(type), value: 0 };
    }
    acc[type].value += cost.amount;
    return acc;
  }, {});

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on SystemBilling page');
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/text%3E%3C/svg%3E';
              }}
            />
            <div className="shine-effect"></div>
          </div>
          <style>
            {`
              @keyframes shine {
                0% {
                  transform: translateX(-100%) translateY(100%) rotate(-45deg);
                  opacity: 0;
                }
                50% {
                  opacity: 1;
                }
                100% {
                  transform: translateX(100%) translateY(-100%) rotate(-45deg);
                  opacity: 0;
                }
              }
              .shine-effect {
                position: absolute;
                top: -50%;
                left: -50%;
                width: 250%;
                height: 250%;
                background: linear-gradient(
                  to right,
                  rgba(255, 255, 255, 0) 0%,
                  rgba(255, 255, 255, 0) 20%,
                  rgba(255, 255, 255, 0.8) 50%,
                  rgba(255, 255, 255, 0) 80%,
                  rgba(255, 255, 255, 0) 100%
                );
                animation: shine 2.5s ease-in-out infinite;
                pointer-events: none;
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Faturamento Sistema</h1>
            <p className="text-gray-600">Receitas, custos e distribuição de lucros (Acumulados)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-2xl w-48"
          />
          {!cashBalance && (
            <Button
              onClick={handleCloseMonth}
              className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Fechar Mês
            </Button>
          )}
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="rounded-2xl"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Lucro Acumulado</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalRevenue.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {payments.length} pagamento{payments.length !== 1 ? 's' : ''} (mês)
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <ArrowUpCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Custos Acumulados</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {totalCosts.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {costs.length} custo{costs.length !== 1 ? 's' : ''} (mês)
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <ArrowDownCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Distribuições Acumuladas</p>
                <p className="text-2xl font-bold text-purple-600">
                  R$ {totalDistributed.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {distributions.length} dist. (mês)
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Caixa Acumulado</p>
                <p className={`text-2xl font-bold ${currentCashBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  R$ {currentCashBalance.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Lucro - Custos - Dist.
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Historical Trend - 12 months */}
        <Card className="xl:col-span-2 rounded-3xl border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Evolução Financeira Acumulada (12 Meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => `R$ ${value.toFixed(2).replace('.', ',')}`}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Line type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={3} name="Lucro Acumulado" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="custos" stroke="#ef4444" strokeWidth={3} name="Custos Acumulados" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="distribuicoes" stroke="#8b5cf6" strokeWidth={3} name="Distribuições Acumuladas" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="caixa" stroke="#3b82f6" strokeWidth={3} name="Caixa Acumulado" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Categories */}
        <Card className="rounded-3xl border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Custos por Categoria (Mês Atual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(costCategoryData).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={Object.values(costCategoryData)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.values(costCategoryData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2).replace('.', ',')}`} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Nenhum custo registrado neste mês
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distributions by Admin */}
        <Card className="rounded-3xl border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Distribuições do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distributions.length > 0 && distributions[0].distributions?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distributions[0].distributions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="admin_name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toFixed(2).replace('.', ',')}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="amount" fill="#8b5cf6" name="Distribuído" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Nenhuma distribuição realizada neste mês
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribution Button */}
      {currentCashBalance > 0 && (
        <Card className="rounded-3xl border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Distribuição de Lucros</h3>
                <p className="text-sm text-gray-600">
                  Distribua o lucro entre os administradores do sistema
                </p>
              </div>
              <Button
                onClick={handleOpenDistribution}
                className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
              >
                <Users className="w-4 h-4 mr-2" />
                Distribuir Lucro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Distributions */}
      {distributions.length > 0 && (
        <Card className="rounded-3xl border-gray-200">
          <CardHeader>
            <CardTitle>Distribuições Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distributions.map((dist) => (
                <Card key={dist.id} className="rounded-2xl border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {format(new Date(dist.distribution_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-sm text-gray-600">Lucro: R$ {dist.total_profit.toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Concluído</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {dist.distributions.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-600 truncate">{item.admin_name}</p>
                          <p className="font-semibold text-gray-900">
                            R$ {item.amount.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Modal */}
      <Dialog open={showDistributionModal} onOpenChange={setShowDistributionModal}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Distribuir Lucro entre Administradores</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="rounded-2xl bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Saldo Anterior</p>
                    <p className="text-lg font-bold text-gray-700">
                      R$ {openingBalance.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lucro do Mês</p>
                    <p className="text-lg font-bold text-green-600">
                      R$ {totalRevenue.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Custos do Mês</p>
                    <p className="text-lg font-bold text-red-600">
                      R$ {totalCosts.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Caixa Disponível</p>
                    <p className="text-lg font-bold text-blue-600">
                      R$ {currentCashBalance.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {distributionData.map((item) => (
                <Card key={item.admin_id} className="rounded-2xl border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.admin_name}</p>
                      </div>
                      <div className="w-48">
                        <Label className="text-xs text-gray-600">Valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => handleAmountChange(item.admin_id, e.target.value)}
                          placeholder="0.00"
                          className="rounded-xl mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="rounded-2xl bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Total a Distribuir:</span>
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold ${
                      distributionData.reduce((sum, item) => sum + item.amount, 0) > currentCashBalance 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      R$ {distributionData.reduce((sum, item) => sum + item.amount, 0).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-sm text-gray-500">
                      / R$ {currentCashBalance.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDistributionModal(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveDistribution}
              disabled={distributionData.reduce((sum, item) => sum + item.amount, 0) > currentCashBalance}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar Distribuição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}