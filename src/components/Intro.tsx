import './components.css'

export type IntroProps = {
  onStart: () => void
}

const questions = [
  {
    number: '01',
    title: 'Хотите выглядеть профессионально?',
    text: 'Соберите аккуратный медиакит, который коротко расскажет о вас, вашей специализации и опыте.',
  },
  {
    number: '02',
    title: 'Нужно быстро представить себя партнёру?',
    text: 'Все главное будет на четырёх слайдах: аудитория, задачи, результаты и контакты.',
  },
  {
    number: '03',
    title: 'Неудобно редактировать презентацию?',
    text: 'Ответьте на вопросы анкеты — готовый медиакит сформируется автоматически.',
  },
]

const scenarios = [
  'Отправить туроператору перед знакомством',
  'Приложить к предложению о сотрудничестве',
  'Познакомиться с отелем или авиакомпанией',
  'Представиться в профессиональном сообществе',
  'Быстро рассказать о себе новому партнёру',
]

export function Intro({ onStart }: IntroProps) {
  return (
    <main className="intro" aria-labelledby="intro-title">
      <section className="intro__hero">
        <div className="intro__hero-content">
          <div className="intro__eyebrow"><span aria-hidden="true" /> Конструктор медиакита турагента</div>
          <h1 id="intro-title">Расскажите о себе.<br /><em>Мы соберём медиакит.</em></h1>
          <p className="intro__lead">
            Заполните простую анкету и получите готовый PDF из четырёх слайдов — без ручной вёрстки и редактирования презентации.
          </p>
          <button className="button button--primary button--hero" type="button" onClick={onStart}>
            Создать медиакит <span aria-hidden="true">→</span>
          </button>
          <p className="intro__time">Бесплатно · без регистрации · около 10 минут</p>
        </div>

        <div className="intro__visual" aria-hidden="true">
          <div className="intro__visual-back" />
          <div className="intro__visual-card">
            <span className="intro__visual-label">MEDIA KIT</span>
            <strong>КТО Я</strong>
            <div className="intro__visual-lines"><i /><i /><i /></div>
            <div className="intro__visual-footer">ТУРАГЕНТ · ПУТЕШЕСТВИЯ</div>
          </div>
        </div>
      </section>

      <section className="intro__section" aria-labelledby="intro-questions">
        <p className="section-kicker">Зачем это вам</p>
        <h2 id="intro-questions">Знакомые ситуации?</h2>
        <div className="question-grid">
          {questions.map((question) => (
            <article className="question-card" key={question.number}>
              <span className="question-card__number" aria-hidden="true">{question.number}</span>
              <h3>{question.title}</h3>
              <p>{question.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="intro__section intro__section--scenarios" aria-labelledby="intro-scenarios">
        <div>
          <p className="section-kicker">Готовый инструмент</p>
          <h2 id="intro-scenarios">Где пригодится медиакит</h2>
          <p className="intro__section-copy">
            Один понятный файл вместо длинного рассказа в переписке. Его удобно открыть и с телефона, и с компьютера.
          </p>
        </div>
        <ol className="scenario-list">
          {scenarios.map((scenario, index) => (
            <li key={scenario}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              {scenario}
            </li>
          ))}
        </ol>
      </section>

      <section className="intro__cta" aria-label="Начать создание медиакита">
        <div>
          <p className="section-kicker">Начнём?</p>
          <h2>Четыре шага — и медиакит готов</h2>
          <p>Подсказки помогут сформулировать ответы и уложиться в макет.</p>
        </div>
        <button className="button button--primary" type="button" onClick={onStart}>
          Заполнить анкету <span aria-hidden="true">→</span>
        </button>
      </section>
    </main>
  )
}

export default Intro
