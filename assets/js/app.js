$(document).ready(function () {
    let allTracks = [];
    let filteredData = [];
    let selectedItems = JSON.parse(localStorage.getItem('btb_carrinho')) || [];
    let currentAudio = new Audio();
    
    let itemsPerBatch = 100; // Quantidade de músicas por vez
    let currentIndex = 0;

    // 1. Carregar Dados
    $.getJSON('tracks.json', function(data) {
        allTracks = data;
        filteredData = allTracks;
        renderNextBatch();
        updateUI();
    });

    // 2. Renderização por Demanda (Lazy Load)
    function renderNextBatch() {
        const nextBatch = filteredData.slice(currentIndex, currentIndex + itemsPerBatch);
        let html = '';
        
        nextBatch.forEach(t => {
            const isChecked = selectedItems.find(i => i.link === t.link) ? 'checked' : '';
            const rowClass = isChecked ? 'selected' : '';
            
            html += `
            <tr class="${rowClass}">
                <td><button class="player-btn" data-link="${t.link}">▶</button> ${t.musica}</td>
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

    // 3. Scroll Infinito
    $(window).scroll(function() {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 200) {
            if (currentIndex < filteredData.length) {
                $('#loading-msg').show();
                renderNextBatch();
            }
        }
    });

    // 4. Busca
    $('#myInput').on('keyup', function() {
        const query = $(this).val().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        filteredData = allTracks.filter(t => 
            t.musica.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query) || 
            t.artista.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query)
        );

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

    // 6. Seleção
    $(document).on('change', '.track-checkbox', function() {
        const info = $(this).data('info');
        const link = $(this).data('link');

        if ($(this).is(':checked')) {
            selectedItems.push({info: info, link: link});
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
            htmlLista += `<li class="list-group-item">${item.info}</li>`;
        });
        $('#listaRevisao').html(htmlLista);

        if (count > 0) {
            $('#floatingCounterContainer, #finalizarBtn').fadeIn();
        } else {
            $('#floatingCounterContainer, #finalizarBtn').fadeOut();
            $('#myModal').modal('hide');
        }
    }

    // 7. WhatsApp (COLOQUE SEU NÚMERO ABAIXO)
    $('#finalizarBtn').click(() => $('#myModal').modal('show'));

    $('#btnEnviarWhats').click(function() {
        let msg = "Olá! Gostaria de encomendar estas backing tracks:\n\n";
        selectedItems.forEach(i => msg += "- " + i.info + "\n");
        msg += "\nTotal estimado: " + $('#totalText').text();
        
        const numero = "5511999999999"; // <--- SEU NÚMERO AQUI (DDI + DDD + NUMERO)
        const url = "https://api.whatsapp.com/send?phone=" + numero + "&text=" + encodeURIComponent(msg);
        window.open(url, '_blank');
    });

    $('#limparCarrinho').click(function() {
        if(confirm("Limpar todas as seleções?")) {
            selectedItems = [];
            localStorage.removeItem('btb_carrinho');
            $('.track-checkbox').prop('checked', false);
            $('.selected').removeClass('selected');
            updateUI();
        }
    });
});