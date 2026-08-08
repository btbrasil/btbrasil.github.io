$(document).ready(function () {
    let allTracks = [];
    let filteredData = [];
    let selectedItems = JSON.parse(localStorage.getItem('btb_carrinho')) || [];
    let currentAudio = new Audio();
    
    let itemsPerBatch = 100; 
    let currentIndex = 0;
    let avisoNavegacaoExibido = false;

    // --- CONFIGURAÇÃO DO SERVIDOR DE MÚSICAS ---
    const BASE_URL_NETLIFY = "https://demos-backingtrackbrasil.netlify.app";

    // 1. Carregar Dados e Organizar por Título da Música
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
        console.error("Erro ao carregar tracks.json");
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

    // 3. Scroll Infinito
    $(window).scroll(function() {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 400) {
            if (currentIndex < filteredData.length) {
                $('#loading-msg').show();
                renderNextBatch();
            }
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

    // 5. Player de Áudio (CORRIGIDO E SEGURO)
    $(document).on('click', '.player-btn', function() {
        const btn = $(this);
        const urlOriginal = btn.data('link'); 
        let urlFinal = "";

        // LÓGICA DE SEPARAÇÃO: Dropbox vs Netlify
        if (urlOriginal.includes('http')) {
            // Se tem HTTP, é link direto (Dropbox). Usamos como está.
            urlFinal = urlOriginal;
        } else {
            // Se não tem, limpamos o "/demos/" e montamos para o Netlify
            const arquivoLimpo = urlOriginal.replace('/demos/', '');
            // encodeURI lida com espaços e acentos no nome do arquivo MP3
            urlFinal = BASE_URL_NETLIFY + '/' + encodeURI(arquivoLimpo);
        }

        // Se clicar no mesmo que está tocando -> Pausa
        if (currentAudio.src === urlFinal || decodeURI(currentAudio.src) === urlFinal) {
            if (!currentAudio.paused) {
                currentAudio.pause();
                btn.text('▶');
                return;
            }
        }

        // Reseta todos os botões para Play
        $('.player-btn').text('▶');

        // Configura e toca
        currentAudio.src = urlFinal;
        currentAudio.load(); // Força o navegador a reconhecer o novo arquivo
        
        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                btn.text('⏸');
            }).catch(error => {
                console.warn("Navegador bloqueou ou arquivo não encontrado:", urlFinal);
            });
        }
    });

    currentAudio.onended = () => $('.player-btn').text('▶');

    // 6. Seleção (Carrinho)
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
        msg += "\nTotal estimado: " + $('#totalText').text();
        const numero = "55XXXXXXXXXXX"; // Troque pelo seu número
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
        $('.btb-toast').text(message).stop(true, true).fadeIn().delay(8000).fadeOut();
    }

    setInterval(function() { $.get('/'); }, 600000);
});
