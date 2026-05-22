// Versão simplificada do Mostrar Perfil para teste
async function mostrarPerfilElevacao() {
    console.log('🔍 DEBUG: Verificando rotas...');
    console.log('window.currentRoutes:', window.currentRoutes);
    console.log('window.activeRouteIndex:', window.activeRouteIndex);
    console.log('window.rotaAtual:', window.rotaAtual);
    console.log('window.lastCreatedRoute:', window.lastCreatedRoute);
    
    let route = null;
    let mode = 'car';
    
    // Tenta diferentes fontes
    if (window.currentRoutes && window.currentRoutes.length > 0) {
        const idx = window.activeRouteIndex || 0;
        route = window.currentRoutes[idx];
        mode = window.currentMode || 'car';
        console.log('✅ Rota encontrada em currentRoutes');
    } else if (window.rotaAtual) {
        route = window.rotaAtual;
        mode = window.rotaModoAtual || 'car';
        console.log('✅ Rota encontrada em rotaAtual');
    } else if (window.lastCreatedRoute) {
        route = window.lastCreatedRoute;
        mode = window.lastRouteMode || 'car';
        console.log('✅ Rota encontrada em lastCreatedRoute');
    } else {
        alert('❌ Nenhuma rota ativa! Trace uma rota primeiro clicando em "Criar rota".');
        console.error('❌ Nenhuma fonte de rota encontrada');
        return;
    }
    
    if (!route || !route.geometry) {
        alert('❌ Rota encontrada mas sem geometria. Trace uma nova rota.');
        return;
    }
    
    console.log('✅ Rota OK! Abrindo perfil...');
    alert('✅ Rota detectada! Abrindo perfil de elevação...');
    
    // Resto do código do perfil...
    // (manter o resto da função igual)
}