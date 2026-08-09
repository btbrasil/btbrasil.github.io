$(document).ready(function () {
    let allTracks = [];
    let filteredData = [];
    let selectedItems = JSON.parse(localStorage.getItem('btb_carrinho')) || [];
    let currentAudio = new Audio();
    
    let itemsPerBatch = 100; 
    let currentIndex = 0;
    let avisoNavegacaoExibido = false;

    const BASE_URL_NETLIFY = "https://demos-backingtrackbrasil.netlify.app";

    // 1. Carregar Dados
    $.getJSON('tracks.json', function(data) {
        allTracks = data.sort((a, b) => {
            let comp = a.musica.localeCompare(b.musica, 'pt-BR', { sensitivity: 'base' });
            if (comp === 0) return a.artista.localeCompare(b.artista, 'pt-BR', { sensitivity: 'base' });
            return comp;
        });
        filteredData = allTracks;
        renderNextBatch();
        updateUI();

        // --- NOVO: LÓGICA DE BUSCA VIA URL (PARA SEO) ---
        const urlParams = new URLSearchParams(window.location.search);
        const buscaUrl = urlParams.get('busca');
        if (buscaUrl) {
            $('#myInput').val(buscaUrl).trigger('keyup');
            // Rola a página até a tabela para o usuário ver o resultado
            $('html, body').animate({ scrollTop: $('#tabela-container').offset().top - 50 }, 'slow');
        }
    });

    // 2. Renderização (Lazy Load)
    function renderNextBatch() {
        const nextBatch = filteredData.slice(currentIndex, currentIndex + itemsPerBatch);
        let html = '';
        nextBatch.forEach(t => {
            // Lógica do Vocal
            let etiquetaVocal = (t.tem_vocal == 1 || t.tem_vocal == "1") ? '<br><span class="vocal-label">🎤 VOCAL OPCIONAL</span>' : '';
            
            const isChecked = selectedItems.find(i => i.link === t.link) ? 'checked' : '';
            const rowClass = isChecked ? 'selected' : '';
            
            html += `<tr class="${rowClass}">
                <td>
                    <div class="song-cell-inner">
                        <button class="player-btn" data-link="${t.link}">▶</button>
                        <span class="song-title">${t.musica}${etiquetaVocal}</span> <!-- CORRIGIDO: Adicionado etiquetaVocal aqui -->
                    </div>
                </td>
                <td>${t.artista}</td>
                <td class="checkbox-cell">
                    <input type="checkbox" class="track-checkbox" data-info="${t.musica} - ${t.artista}" data-link="${t.link}" ${isChecked}>
                </td>
            </tr>`;
        });
        $('#myTable').append(html);
        currentIndex += itemsPerBatch;
    }

    // 3. Scroll Infinito
    $(window).scroll(function() {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 400) {
            if (currentIndex < filteredData.length) renderNextBatch();
        }
    });

    // 4. Busca
    $('#myInput').on('keyup', function() {
        const query = $(this).val().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        filteredData = allTracks.filter(t => {
            const m = t.musica.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const a = t.artista.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return m.includes(query) || a.includes(query);
        });
        $('#myTable').empty(); 
        currentIndex = 0; 
        renderNextBatch();
    });

    // 5. Player
    $(document).on('click', '.player-btn', function() {
        const btn = $(this);
        const urlJSON = btn.data('link'); 
        let urlFinal = urlJSON.includes('http') ? urlJSON : BASE_URL_NETLIFY + '/' + urlJSON.replace('/demos/', '');

        if (currentAudio.src === urlFinal && !currentAudio.paused) {
            currentAudio.pause();
            btn.text('▶');
            return;
        }

        $('.player-btn').text('▶');
        currentAudio.src = urlFinal;
        currentAudio.play().then(() => {
            btn.text('⏸');
        }).catch(error => console.error("Erro ao tocar:", urlFinal));
    });

    currentAudio.onended = () => $('.player-btn').text('▶');

    // 6. Seleção (Carrinho)
    $(document).on('change', '.track-checkbox', function() {
        const info = $(this).data('info');
        const link = $(this).data('link');
        if ($(this).is(':checked')) {
            if (!selectedItems.find(i => i.link === link)) selectedItems.push({info: info, link: link});
            $(this).closest('tr').addClass('selected');
            if (!avisoNavegacaoExibido && selectedItems.length === 1) {
                showToast("Seleção salva! Você pode navegar à vontade antes de finalizar."); 
                avisoNavegacaoExibido = true;
            }
        } else {
            selectedItems = selectedItems.filter(i => i.link !== link);
            $(this).closest('tr').removeClass('selected');
        }
        localStorage.setItem('btb_carrinho', JSON.stringify(selectedItems));
        updateUI();
    });

    // 6.5 Clique na célula 
    $(document).on('click', '.checkbox-cell', function(e) {
        if (!$(e.target).is('input')) {
            const cb = $(this).find('.track-checkbox');
            cb.prop('checked', !cb.prop('checked')).trigger('change');
        }
    });

    function updateUI() {
        const count = selectedItems.length;
        $('#selectedCount').text(count);
        $('#totalText').text('R$ ' + (count * 15).toFixed(2));
        let htmlLista = '';
        selectedItems.forEach(item => {
            htmlLista += `<li class="list-group-item">${item.info}</li>`;
        });
        $('#listaRevisao').html(htmlLista);
        if (count > 0) $('#floatingCounterContainer, #finalizarBtn').fadeIn();
        else $('#floatingCounterContainer, #finalizarBtn').fadeOut();
    }

    $('#finalizarBtn').click(() => $('#myModal').modal('show'));

    $('#btnEnviarWhats').click(function() {
        if (selectedItems.length === 0) return;
        let msg = "Olá! Tenho interesse nessas backing tracks:\n\n";
        selectedItems.forEach(i => msg += "- " + i.info + "\n");
        msg += "\nValor: " + $('#totalText').text();
        const numero = "553591287114"; 
        window.open("https://api.whatsapp.com/send?phone=" + numero + "&text=" + encodeURIComponent(msg), '_blank');
    });

    $('#limparCarrinho').click(function() {
        if(confirm("Limpar tudo?")) {
            selectedItems = []; localStorage.removeItem('btb_carrinho');
            $('.track-checkbox').prop('checked', false); $('.selected').removeClass('selected'); updateUI();
        }
    });

    function showToast(message) {
        if ($('.btb-toast').length === 0) $('body').append('<div class="btb-toast"></div>');
        $('.btb-toast').text(message).stop(true, true).fadeIn().delay(8000).fadeOut();
    }
});
