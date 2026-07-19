$(document).ready(function () {
    let allTracks = [];
    let selectedItems = JSON.parse(localStorage.getItem('btb_carrinho')) || [];
    let currentAudio = new Audio();
    let avisoExibido = false;

    // 1. Carrega os dados do JSON
    $.getJSON('tracks.json', function(data) {
        allTracks = data;
        updateUI(); // Atualiza se já houver algo no carrinho
        console.log("Catálogo carregado: " + allTracks.length + " músicas.");
    });

    // 2. Busca em Tempo Real (Filtragem rápida)
    $('#myInput').on('keyup', function() {
        const query = $(this).val().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        if (query.length < 2) {
            $('#tabela-container').hide();
            $('#home-msg').show();
            return;
        }

        const filtered = allTracks.filter(t => 
            t.musica.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query) || 
            t.artista.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query)
        ).slice(0, 50); // Mostra apenas os 50 primeiros para ser rápido

        renderTable(filtered);
    });

    function renderTable(data) {
        let html = '';
        data.forEach(t => {
            const isChecked = selectedItems.find(i => i.link === t.link) ? 'checked' : '';
            const rowClass = isChecked ? 'selected' : '';
            
            html += `
            <tr class="${rowClass}">
                <td>
                    <button class="player-btn" data-link="${t.link}">▶</button>
                    ${t.musica}
                </td>
                <td>${t.artista}</td>
                <td class="checkbox-cell">
                    <input type="checkbox" class="track-checkbox" 
                        data-info="${t.musica} - ${t.artista}" 
                        data-link="${t.link}" ${isChecked}>
                </td>
            </tr>`;
        });
        $('#myTable').html(html);
        $('#home-msg').hide();
        $('#tabela-container').show();
    }

    // 3. Player e Seleção (Lógica simplificada)
    $(document).on('click', '.player-btn', function() {
        const url = $(this).data('link');
        if (currentAudio.src.includes(url) && !currentAudio.paused) {
            currentAudio.pause();
            $(this).text('▶');
        } else {
            $('.player-btn').text('▶');
            currentAudio.src = url;
            currentAudio.play();
            $(this).text('⏸');
        }
    });

    $(document).on('change', '.track-checkbox', function() {
        const info = $(this).data('info');
        const link = $(this).data('link');

        if ($(this).is(':checked')) {
            selectedItems.push({info: info, link: link});
            if (!avisoExibido) {
                alert("Música adicionada! Suas escolhas ficam salvas enquanto você navega.");
                avisoExibido = true;
            }
        } else {
            selectedItems = selectedItems.filter(i => i.link !== link);
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
            htmlLista += `<li class="list-group-item">${item.info}</li>`;
        });
        $('#listaRevisao').html(htmlLista);

        if (count > 0) {
            $('#floatingCounterContainer, #finalizarBtn').show();
        } else {
            $('#floatingCounterContainer, #finalizarBtn').hide();
        }
    }

    // 4. Finalizar via WhatsApp
    $('#finalizarBtn').click(() => $('#myModal').modal('show'));

    $('#btnEnviarWhats').click(function() {
        let msg = "Olá! Gostaria de encomendar estas backing tracks:\n\n";
        selectedItems.forEach(i => msg += "- " + i.info + "\n");
        msg += "\nTotal: " + $('#totalText').text();
        
        const url = "https://api.whatsapp.com/send?phone=55XXXXXXXXXXX&text=" + encodeURIComponent(msg);
        window.open(url, '_blank');
    });

    $('#limparCarrinho').click(function() {
        if(confirm("Limpar tudo?")) {
            selectedItems = [];
            localStorage.removeItem('btb_carrinho');
            updateUI();
            $('.track-checkbox').prop('checked', false);
        }
    });
});