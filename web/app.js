// 상수 정의
const STORAGE_KEY = "todos"

// DOM 요소
const todoForm = document.getElementById("todo-form")
const todoInput = document.getElementById("todo-input")
const todoList = document.getElementById("todo-list")
const loadingMessage = document.getElementById("loading-message")
const emptyMessage = document.getElementById("empty-message")
const todoItemTemplate = document.getElementById("todo-item-template")
const todoEditTemplate = document.getElementById("todo-edit-template")

// 상태 관리
let todos = []

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  loadTodos()
  todoForm.addEventListener("submit", handleAddTodo)
})

// 할 일 목록 로드
function loadTodos() {
  try {
    // 로컬 스토리지에서 데이터 확인
    const storedTodos = localStorage.getItem(STORAGE_KEY)

    if (storedTodos) {
      // 로컬 스토리지에 데이터가 있으면 사용
      todos = JSON.parse(storedTodos)
    } else {
      // 기본 할 일 목록
      todos = [
        {
          id: 1,
          text: "프로젝트 계획 수립하기",
          completed: false,
        },
        {
          id: 2,
          text: "디자인 시안 검토하기",
          completed: true,
        },
        {
          id: 3,
          text: "API 문서 작성하기",
          completed: false,
        },
      ]
      // 로컬 스토리지에 저장
      saveTodos()
    }
  } catch (error) {
    console.error("할 일 목록 로드 오류:", error)
    todos = []
  } finally {
    renderTodos()
    loadingMessage.classList.add("hidden")
  }
}

// 할 일 목록 저장
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

// 할 일 목록 렌더링
function renderTodos() {
  // 목록 초기화
  todoList.innerHTML = ""

  // 할 일이 없는 경우
  if (todos.length === 0) {
    emptyMessage.classList.remove("hidden")
    return
  }

  // 할 일이 있는 경우
  emptyMessage.classList.add("hidden")

  // 할 일 항목 렌더링
  todos.forEach((todo) => {
    const todoItem = createTodoItem(todo)
    todoList.appendChild(todoItem)
  })
}

// 할 일 항목 생성
function createTodoItem(todo) {
  const template = todoItemTemplate.content.cloneNode(true)
  const todoItem = template.querySelector(".todo-item")

  // ID 설정
  todoItem.dataset.id = todo.id

  // 체크박스 설정
  const checkbox = todoItem.querySelector(".todo-checkbox")
  checkbox.checked = todo.completed
  checkbox.id = `todo-${todo.id}`
  checkbox.addEventListener("change", () => handleToggleTodo(todo.id))

  // 텍스트 설정
  const todoText = todoItem.querySelector(".todo-text")
  todoText.textContent = todo.text
  todoText.htmlFor = `todo-${todo.id}`
  if (todo.completed) {
    todoText.classList.add("completed")
  }

  // 버튼 이벤트 설정
  const editButton = todoItem.querySelector(".edit-button")
  editButton.addEventListener("click", () => handleEditMode(todo.id))

  const deleteButton = todoItem.querySelector(".delete-button")
  deleteButton.addEventListener("click", () => handleDeleteTodo(todo.id))

  return todoItem
}

// 할 일 수정 모드 UI 생성
function createTodoEditItem(todo) {
  const template = todoEditTemplate.content.cloneNode(true)
  const todoEditItem = template.querySelector(".todo-item-edit")

  // 입력 필드 설정
  const editInput = todoEditItem.querySelector(".todo-edit-input")
  editInput.value = todo.text
  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleUpdateTodo(todo.id, editInput.value)
    } else if (e.key === "Escape") {
      renderTodos()
    }
  })

  // 버튼 이벤트 설정
  const saveButton = todoEditItem.querySelector(".save-button")
  saveButton.addEventListener("click", () => handleUpdateTodo(todo.id, editInput.value))

  const cancelButton = todoEditItem.querySelector(".cancel-button")
  cancelButton.addEventListener("click", renderTodos)

  return todoEditItem
}

// 할 일 추가 처리
function handleAddTodo(e) {
  e.preventDefault()

  const text = todoInput.value.trim()
  if (!text) return

  // 새 할 일 생성
  const newId = todos.length > 0 ? Math.max(...todos.map((todo) => todo.id)) + 1 : 1
  const newTodo = {
    id: newId,
    text: text,
    completed: false,
  }

  // 할 일 목록에 추가
  todos.push(newTodo)

  // 저장 및 렌더링
  saveTodos()
  renderTodos()

  // 입력 필드 초기화
  todoInput.value = ""
}

// 할 일 완료 상태 토글 처리
function handleToggleTodo(id) {
  todos = todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))

  saveTodos()
  renderTodos()
}

// 할 일 수정 모드 처리
function handleEditMode(id) {
  const todo = todos.find((todo) => todo.id === id)
  if (!todo) return

  const todoItem = document.querySelector(`.todo-item[data-id="${id}"]`)
  if (!todoItem) return

  // 기존 항목 숨기기
  todoItem.innerHTML = ""

  // 수정 UI 추가
  const editItem = createTodoEditItem(todo)
  todoItem.appendChild(editItem)

  // 입력 필드에 포커스
  const editInput = todoItem.querySelector(".todo-edit-input")
  editInput.focus()
}

// 할 일 수정 처리
function handleUpdateTodo(id, newText) {
  if (!newText.trim()) return

  todos = todos.map((todo) => (todo.id === id ? { ...todo, text: newText.trim() } : todo))

  saveTodos()
  renderTodos()
}

// 할 일 삭제 처리
function handleDeleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id)

  saveTodos()
  renderTodos()
}
