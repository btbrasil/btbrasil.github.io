$(document).ready(function () {
    let allTracks = [];
    let filteredData = [];
    let selectedItems = JSON.parse(localStorage.getItem('btb_carrinho')) || [];
    let currentAudio = new Audio();
    
    let itemsPerBatch = 100; // Carrega de 100 em 100
    let currentIndex = 0;

    // 1. Carregar Dados e Organizar
    $.getJSON('tracks.json', function(data) {
        // Garantimos a ordenação também no JS por segurança
        allTracks = data.sort((a, b) => {
            return a.artista.localeCompare(b.artista, 'pt-BR', { sensitivity: 'base' });
        });
        
        filteredData = allTracks;
        renderNextBatch();
        updateUI();
    }).fail(function() {
        alert("Erro ao carregar a lista de músicas. Verifique se o arquivo tracks.json está no GitHub.");
    });

    // 2. Renderização por Demanda (Lazy Load)
    function renderNextBatch() {
        const nextBatch = filteredData.slice(currentIndex, currentIndex + itemsPerBatch);
        let html = '';
        
        nextBatch.forEach(t => {
            // Verifica se a música já estava selecionada (persistência)
            const isChecked = selectedItems.find(i => i.link === t.link) ? 'checked' : '';
            const rowClass = isChecked ? 'selected' : '';
            
            html += `
            <tr class="${rowClass}">
                <td>
                    <div class="song-cell-inner">
                        <button class="player-btn" data-link="${t.link}">▶</button>
                        <span class="song-title">${t.musica}</span>
                    </div>
                </td>
                <td>${t.artista}</td>
                <td class="checkbox-cell">
                    <input type="checkbox" class="track-checkbox" 
                        data-info="${t.musica} - ${t.artista}" 
                        data-link="${t.link}" ${isChecked}>
                </td>
            </tr>`;
        });

        $('#myTable').append(html);
        currentIndex += itemsPerBatch;
        $('#loading-msg').hide();
    }

    // 3. Scroll Infinito (Detecta quando o usuário chega no fim da página)
    $(window).scroll(function() {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 300) {
            if (currentIndex < filteredData.length) {
                $('#loading-msg').show();
                renderNextBatch();
            }
        }
    });

    // 4. Busca Otimizada (Filtra na memória e reseta a tabela)
    $('#myInput').on('keyup', function() {
        const query = $(this).val().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        filteredData = allTracks.filter(t => {
            const m = t.musica.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const a = t.artista.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return m.includes(query) || a.includes(query);
        });

        // Limpa a tabela e recomeça do topo com os resultados filtrados
        $('#myTable').empty();
        currentIndex = 0;
        renderNextBatch();
    });

    // 5. Player de Áudio
    $(document).on('click', '.player-btn', function() {
        const btn = $(this);
        const url = btn.data('link');

        if (currentAudio.src.includes(url) && !currentAudio.paused) {
            currentAudio.pause();
            btn.text('▶');
        } else {
            $('.player-btn').text('▶');
            currentAudio.src = url;
            currentAudio.play();
            btn.text('⏸');
        }
    });

    currentAudio.onended = () => $('.player-btn').text('▶');

    // 6. Seleção de Músicas (Carrinho)
    $(document).on('change', '.track-checkbox', function() {
        const info = $(this).data('info');
        const link = $(this).data('link');

        if ($(this).is(':checked')) {
            if (!selectedItems.find(i => i.link === link)) {
                selectedItems.push({info: info, link: link});
            }
            $(this).closest('tr').addClass('selected');
        } else {
            selectedItems = selectedItems.filter(i => i.link !== link);
            $(this).closest('tr').removeClass('selected');
        }
        
        localStorage.setItem('btb_carrinho', JSON.stringify(selectedItems));
        updateUI();
    });

    function updateUI() {
        const count = selectedItems.length;
        $('#selectedCount').text(count);
        $('#totalText').text('R$ ' + (count * 15).toFixed(2));
        
        let htmlLista = '';
        selectedItems.forEach(item => {
            htmlLista += `<li class="list-group-item d-flex justify-content-between align-items-center">
                ${item.info}
            </li>`;
        });
        $('#listaRevisao').html(htmlLista);

        if (count > 0) {
            $('#floatingCounterContainer, #finalizarBtn').fadeIn();
        } else {
            $('#floatingCounterContainer, #finalizarBtn').fadeOut();
            $('#myModal').modal('hide');
        }
    }

    // 7. Envio para o WhatsApp
    $('#finalizarBtn').click(() => $('#myModal').modal('show'));

    $('#btnEnviarWhats').click(function() {
        if (selectedItems.length === 0) return;

        let msg = "Olá! Gostaria de encomendar estas backing tracks:\n\n";
        selectedItems.forEach(i => msg += "- " + i.info + "\n");
        msg += "\nTotal: " + $('#totalText').text();
        
        const numero = "55XXXXXXXXXXX"; // <--- COLOQUE SEU WHATSAPP AQUI (DDI+DDD+NUMERO)
        const url = "https://api.whatsapp.com/send?phone=" + numero + "&text=" + encodeURIComponent(msg);
        
        window.open(url, '_blank');
    });

    // 8. Limpar Tudo
    $('#limparCarrinho').click(function() {
        if(confirm("Remover todas as seleções?")) {
            selectedItems = [];
            localStorage.removeItem('btb_carrinho');
            $('.track-checkbox').prop('checked', false);
            $('.selected').removeClass('selected');
            updateUI();
        }
    });
});