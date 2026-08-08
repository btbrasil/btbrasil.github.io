$(document).ready(function () {
    let allTracks = [];
    let filteredData = [];
    let selectedItems = JSON.parse(localStorage.getItem('btb_carrinho')) || [];
    let currentAudio = new Audio();
    
    let itemsPerBatch = 100; 
    let currentIndex = 0;
    let avisoNavegacaoExibido = false;

    const BASE_URL_NETLIFY = "https://demos-backingtrackbrasil.netlify.app";

    $.getJSON('tracks.json', function(data) {
        allTracks = data.sort((a, b) => {
            let comp = a.musica.localeCompare(b.musica, 'pt-BR', { sensitivity: 'base' });
            if (comp === 0) return a.artista.localeCompare(b.artista, 'pt-BR', { sensitivity: 'base' });
            return comp;
        });
        filteredData = allTracks;
        renderNextBatch();
        updateUI();
    }).fail(function() {
        alert("Erro ao carregar a lista de músicas.");
    });

    function renderNextBatch() {
        const nextBatch = filteredData.slice(currentIndex, currentIndex + itemsPerBatch);
        let html = '';
        nextBatch.forEach(t => {
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
                    <input type="checkbox" class="track-checkbox" data-info="${t.musica} - ${t.artista}" data-link="${t.link}" ${isChecked}>
                </td>
            </tr>`;
        });
        $('#myTable').append(html);
        currentIndex += itemsPerBatch;
        $('#loading-msg').hide();
    }

    $(window).scroll(function() {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 300) {
            if (currentIndex < filteredData.length) {
                $('#loading-msg').show();
                renderNextBatch();
            }
        }
    });

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

    // --- PLAYER DE ÁUDIO CORRIGIDO ---
    $(document).on('click', '.player-btn', function() {
        const btn = $(this);
        let urlJSON = btn.data('link'); 
        let urlFinal = "";

        // Verifica se o link já é completo (Dropbox/HTTP) ou se é apenas o caminho (Netlify)
        if (urlJSON.indexOf('http') === 0) {
            urlFinal = urlJSON;
        } else {
            let nomeLimpo = urlJSON.replace('/demos/', '');
            urlFinal = BASE_URL_NETLIFY + '/' + nomeLimpo;
        }

        console.log("DEBUG - Input JSON:", urlJSON);
        console.log("DEBUG - URL Final:", urlFinal);

        if (currentAudio.src === urlFinal && !currentAudio.paused) {
            currentAudio.pause();
            btn.text('▶');
        } else {
            $('.player-btn').text('▶');
            currentAudio.src = urlFinal;
            currentAudio.load();
            currentAudio.play().then(() => {
                btn.text('⏸');
            }).catch(e => {
                console.error("Erro ao tocar:", e);
            });
        }
    });

    currentAudio.onended = () => $('.player-btn').text('▶');

    $(document).on('change', '.track-checkbox', function() {
        const info = $(this).data('info');
        const link = $(this).data('link');
        if ($(this).is(':checked')) {
            if (!selectedItems.find(i => i.link === link)) {
                selectedItems.push({info: info, link: link});
            }
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
        let msg = "Olá! Gostaria destas backing tracks:\n\n";
        selectedItems.forEach(i => msg += "- " + i.info + "\n");
        msg += "\nTotal: " + $('#totalText').text();
        const numero = "55XXXXXXXXXXX"; 
        window.open("https://api.whatsapp.com/send?phone=" + numero + "&text=" + encodeURIComponent(msg), '_blank');
    });

    $('#limparCarrinho').click(function() {
        if(confirm("Remover todas as seleções?")) {
            selectedItems = [];
            localStorage.removeItem('btb_carrinho');
            $('.track-checkbox').prop('checked', false);
            $('.selected').removeClass('selected');
            updateUI();
        }
    });

    function showToast(message) {
        if ($('.btb-toast').length === 0) $('body').append('<div class="btb-toast"></div>');
        $('.btb-toast').text(message).stop(true, true).fadeIn().delay(7000).fadeOut();
    }

    setInterval(function() { $.get('/'); }, 600000);
});
