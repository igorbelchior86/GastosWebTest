// ============================================================================
// 🎨 RENDERERS MODULE
// ============================================================================
// Funções de renderização e atualização da interface
// FASE 4 refatoração - extraindo renderização do main.js

import { DOMSelectors } from './dom-selectors.js';
import { Formatters } from '../js/utils/formatters.js';
import { DateHelpers } from '../js/utils/date-helpers.js';

/**
 * Renderers - Responsável por renderização de componentes
 * 
 * Responsabilidades:
 * - Renderização de listas e tabelas
 * - Atualização de interface
 * - População de modals
 * - Formatação visual de dados
 */
export class Renderers {
  /**
   * Renderiza modal de configurações
   */
  static renderSettingsModal() {
    const modal = DOMSelectors.settingsModal;
    if (!modal) return;

    // Esta função será implementada conforme necessário
    // Por enquanto, apenas garante que o modal existe
    console.log('Settings modal rendered');
  }

  /**
   * Atualiza badge de pendências
   * @param {number} count - Número de pendências
   */
  static updatePendingBadge(count = 0) {
    const badge = DOMSelectors.bySelector('.pending-badge');
    if (badge) {
      badge.textContent = count.toString();
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  /**
   * Renderiza configurações principais
   */
  static renderSettings() {
    // Implementação será adicionada conforme extração do main.js
    console.log('Settings rendered');
  }

  /**
   * Renderiza seletor de cartões
   * @param {Array} cards - Array de cartões
   * @param {string} selectedCard - Cartão selecionado
   */
  static renderCardSelector(cards = [], selectedCard = '') {
    const selector = DOMSelectors.byId('cardSelect');
    if (!selector) return;

    selector.innerHTML = '';

    // Opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione um cartão';
    selector.appendChild(defaultOption);

    // Cartões disponíveis
    cards.forEach(card => {
      const option = document.createElement('option');
      option.value = card.name;
      option.textContent = card.name;
      if (card.name === selectedCard) {
        option.selected = true;
      }
      selector.appendChild(option);
    });
  }

  /**
   * Atualiza métodos de pagamento
   */
  static refreshMethods() {
    // Implementação será adicionada conforme extração
    console.log('Payment methods refreshed');
  }

  /**
   * Renderiza lista de cartões
   * @param {Array} cards - Array de cartões
   */
  static renderCardList(cards = []) {
    const container = DOMSelectors.byId('cardsList');
    if (!container) return;

    container.innerHTML = '';

    if (cards.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhum cartão cadastrado</p>';
      return;
    }

    cards.forEach(card => {
      const cardElement = this.createCardElement(card);
      container.appendChild(cardElement);
    });
  }

  /**
   * Cria elemento visual para um cartão
   * @param {Object} card - Dados do cartão
   * @returns {HTMLElement} Elemento do cartão
   */
  static createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `
      <div class="card-info">
        <h3>${Formatters.escapeHtml(card.name)}</h3>
        <p>Fechamento: dia ${card.close}</p>
        <p>Vencimento: dia ${card.due}</p>
      </div>
      <div class="card-actions">
        <button class="btn-edit" data-card="${Formatters.escapeHtml(card.name)}">Editar</button>
        <button class="btn-delete" data-card="${Formatters.escapeHtml(card.name)}">Excluir</button>
      </div>
    `;
    return div;
  }

  /**
   * Renderiza tabela principal de transações
   * @param {Array} transactions - Array de transações
   */
  static renderTable(transactions = []) {
    const tableContainer = DOMSelectors.byId('transactionTable');
    if (!tableContainer) return;

    if (transactions.length === 0) {
      tableContainer.innerHTML = '<p class="empty-state">Nenhuma transação encontrada</p>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'transaction-table';
    
    // Cabeçalho
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Data</th>
        <th>Descrição</th>
        <th>Categoria</th>
        <th>Cartão</th>
        <th>Valor</th>
        <th>Ações</th>
      </tr>
    `;
    table.appendChild(thead);

    // Corpo
    const tbody = document.createElement('tbody');
    transactions.forEach(transaction => {
      const row = this.createTransactionRow(transaction);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
  }

  /**
   * Cria linha da tabela de transação
   * @param {Object} transaction - Dados da transação
   * @returns {HTMLElement} Linha da tabela
   */
  static createTransactionRow(transaction) {
    const row = document.createElement('tr');
    row.className = 'transaction-row';
    row.dataset.id = transaction.id;
    
    const formattedDate = DateHelpers.formatRelativeDate(transaction.date);
    const formattedAmount = Formatters.formatMoney(transaction.amount);
    
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${Formatters.escapeHtml(transaction.note)}</td>
      <td>${Formatters.escapeHtml(transaction.category)}</td>
      <td>${Formatters.escapeHtml(transaction.card)}</td>
      <td class="amount ${transaction.amount < 0 ? 'negative' : 'positive'}">${formattedAmount}</td>
      <td class="actions">
        <button class="btn-edit-tx" data-id="${transaction.id}">Editar</button>
        <button class="btn-delete-tx" data-id="${transaction.id}">Excluir</button>
      </td>
    `;
    
    return row;
  }

  /**
   * Renderiza grupos de transações
   * @param {Array} groups - Grupos de transações
   */
  static renderTransactionGroups(groups = []) {
    const container = DOMSelectors.byId('groupedTransactions');
    if (!container) return;

    container.innerHTML = '';

    if (groups.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhuma transação agrupada</p>';
      return;
    }

    groups.forEach(group => {
      const groupElement = this.createGroupElement(group);
      container.appendChild(groupElement);
    });
  }

  /**
   * Cria elemento de grupo de transações
   * @param {Object} group - Dados do grupo
   * @returns {HTMLElement} Elemento do grupo
   */
  static createGroupElement(group) {
    const div = document.createElement('div');
    div.className = 'transaction-group';
    
    const total = group.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    div.innerHTML = `
      <div class="group-header">
        <h3>${Formatters.escapeHtml(group.title)}</h3>
        <span class="group-total">${Formatters.formatMoney(total)}</span>
      </div>
      <div class="group-content">
        ${group.transactions.map(tx => this.createMiniTransactionElement(tx).outerHTML).join('')}
      </div>
    `;
    
    return div;
  }

  /**
   * Cria elemento mini para transação (em grupos)
   * @param {Object} transaction - Dados da transação
   * @returns {HTMLElement} Elemento mini da transação
   */
  static createMiniTransactionElement(transaction) {
    const div = document.createElement('div');
    div.className = 'mini-transaction';
    div.dataset.id = transaction.id;
    
    div.innerHTML = `
      <span class="mini-date">${DateHelpers.formatRelativeDate(transaction.date)}</span>
      <span class="mini-note">${Formatters.escapeHtml(transaction.note)}</span>
      <span class="mini-amount ${transaction.amount < 0 ? 'negative' : 'positive'}">
        ${Formatters.formatMoney(transaction.amount)}
      </span>
    `;
    
    return div;
  }

  /**
   * Renderiza accordions
   */
  static renderAccordion() {
    // Implementação será adicionada conforme extração
    console.log('Accordion rendered');
  }

  /**
   * Atualiza cabeçalho do modal de planejados
   * @param {string} period - Período atual
   */
  static updatePlannedModalHeader(period = '') {
    const header = DOMSelectors.bySelector('.planned-modal-header');
    if (header && period) {
      const formattedPeriod = DateHelpers.formatPeriod(period);
      header.textContent = `Transações Planejadas - ${formattedPeriod}`;
    }
  }

  /**
   * Renderiza modal de planejados
   * @param {Array} plannedTransactions - Transações planejadas
   */
  static renderPlannedModal(plannedTransactions = []) {
    const list = DOMSelectors.plannedList;
    if (!list) return;

    list.innerHTML = '';

    if (plannedTransactions.length === 0) {
      list.innerHTML = '<p class="empty-state">Nenhuma transação planejada</p>';
      return;
    }

    plannedTransactions.forEach(planned => {
      const plannedElement = this.createPlannedElement(planned);
      list.appendChild(plannedElement);
    });
  }

  /**
   * Cria elemento de transação planejada
   * @param {Object} planned - Dados da transação planejada
   * @returns {HTMLElement} Elemento da transação planejada
   */
  static createPlannedElement(planned) {
    const div = document.createElement('div');
    div.className = 'planned-item';
    div.dataset.id = planned.id;
    
    div.innerHTML = `
      <div class="planned-info">
        <h4>${Formatters.escapeHtml(planned.note)}</h4>
        <p>Categoria: ${Formatters.escapeHtml(planned.category)}</p>
        <p>Cartão: ${Formatters.escapeHtml(planned.card)}</p>
        <p>Valor: ${Formatters.formatMoney(planned.amount)}</p>
        ${planned.recurrence ? `<p>Recorrência: ${planned.recurrence}</p>` : ''}
      </div>
      <div class="planned-actions">
        <button class="btn-execute" data-id="${planned.id}">Executar</button>
        <button class="btn-edit-planned" data-id="${planned.id}">Editar</button>
        <button class="btn-delete-planned" data-id="${planned.id}">Excluir</button>
      </div>
    `;
    
    return div;
  }

  /**
   * Renderiza loading state
   * @param {HTMLElement} container - Container para loading
   * @param {string} message - Mensagem de loading
   */
  static renderLoading(container, message = 'Carregando...') {
    if (!container) return;
    
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>${Formatters.escapeHtml(message)}</p>
      </div>
    `;
  }

  /**
   * Renderiza estado de erro
   * @param {HTMLElement} container - Container para erro
   * @param {string} message - Mensagem de erro
   */
  static renderError(container, message = 'Ocorreu um erro') {
    if (!container) return;
    
    container.innerHTML = `
      <div class="error-state">
        <p class="error-message">${Formatters.escapeHtml(message)}</p>
        <button class="btn-retry">Tentar novamente</button>
      </div>
    `;
  }

  /**
   * Limpa conteúdo de um container
   * @param {HTMLElement} container - Container a ser limpo
   */
  static clear(container) {
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Atualiza texto de um elemento
   * @param {HTMLElement} element - Elemento a ser atualizado
   * @param {string} text - Novo texto
   * @param {boolean} escape - Se deve escapar HTML
   */
  static updateText(element, text, escape = true) {
    if (!element) return;
    
    if (escape) {
      element.textContent = text;
    } else {
      element.innerHTML = text;
    }
  }

  /**
   * Atualiza múltiplos elementos de uma vez
   * @param {Object} updates - Objeto com seletor: texto
   */
  static updateMultiple(updates) {
    Object.entries(updates).forEach(([selector, text]) => {
      const element = DOMSelectors.bySelector(selector);
      this.updateText(element, text);
    });
  }
}

// Para uso global (compatibilidade)
if (typeof window !== 'undefined') {
  window.Renderers = Renderers;
}