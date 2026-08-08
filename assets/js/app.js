$(document).ready(function () {
    let allTracks = [];
    let filteredData = [];
    let selectedItems = JSON.parse(localStorage.getItem('btb_carrinho')) || [];
    let currentAudio = new Audio();
    
    let itemsPerBatch = 100; 
    let currentIndex = 0;

    // --- CONFIGURAÇÃO DO NOVO SERVIDOR DE MÚSICAS ---
    const BASE_URL_NETLIFY = "https://demos-backingtrackbrasil.netlify.app";

    // 1. Carregar Dados e Organizar
    $.getJSON('tracks.json', function(data) {
        allTracks = data.sort((a, b) => {
            let comp = a.musica.localeCompare(b.musica, 'pt-BR', { sensitivity: 'base' });
            if (comp === 0) {
                return a.artista.localeCompare(b.artista, 'pt-BR', { sensitivity: 'base' });
            }
            return comp;
        });
        
        filteredData = allTracks;
        renderNextBatch();
        updateUI();
    }).fail(function() {
        alert("Erro ao carregar a lista de músicas.");
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
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 300) {
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

    // 5. Player de Áudio (Suporte a Netlify e Dropbox)
    $(document).on('click', '.player-btn', function() {
        const btn = $(this);
        let urlJSON = btn.data('link'); // Pode ser "/demos/..." ou "https://..."
        let urlFinal = "";

        // 1. IDENTIFICA SE O LINK É EXTERNO (Dropbox) OU INTERNO (Netlify)
        if (urlJSON.startsWith('http')) {
            // Se o link já começa com http, é do Dropbox. Usamos ele exatamente como está.
            urlFinal = urlJSON;
        } else {
            // Se não tem http, é um caminho do antigo HostGator.
            // Limpamos o "/demos/" e jogamos para o Netlify.
            let nomeArquivo = urlJSON.replace('/demos/', '');
            urlFinal = BASE_URL_NETLIFY + '/' + nomeArquivo;
        }

        console.log("Tentando tocar:", urlFinal);

        if (currentAudio.src === urlFinal && !currentAudio.paused) {
            currentAudio.pause();
            btn.text('▶');
        } else {
            // Reseta botões e carrega a nova música
            $('.player-btn').text('▶');
            
            // Importante para links do Dropbox: Garantir que o src mude
            currentAudio.src = urlFinal;
            currentAudio.load(); 
            
            currentAudio.play().then(() => {
                btn.text('⏸');
            }).catch(e => {
                console.error("Erro ao tocar:", e);
                // Tentativa de correção para nomes com espaços ou caracteres especiais
                if (!urlJSON.startsWith('http')) {
                    let nomeEscapado = encodeURIComponent(urlJSON.replace('/demos/', '')).replace(/%2F/g, '/');
                    currentAudio.src = BASE_URL_NETLIFY + '/' + nomeEscapado;
                    currentAudio.play().then(() => btn.text('⏸')).catch(err => alert("Erro ao carregar áudio."));
                } else {
                    alert("Não foi possível tocar esta demo do Dropbox. Verifique o link.");
                }
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

    // 7. Envio para o WhatsApp
    $('#finalizarBtn').click(() => $('#myModal').modal('show'));

    $('#btnEnviarWhats').click(function() {
        if (selectedItems.length === 0) return;
        let msg = "Olá! Gostaria de encomendar estas backing tracks:\n\n";
        selectedItems.forEach(i => msg += "- " + i.info + "\n");
        msg += "\nTotal: " + $('#totalText').text();
        
        const numero = "55XXXXXXXXXXX"; // <--- SEU WHATSAPP AQUI
        window.open("https://api.whatsapp.com/send?phone=" + numero + "&text=" + encodeURIComponent(msg), '_blank');
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
