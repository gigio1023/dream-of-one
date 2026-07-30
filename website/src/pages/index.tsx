import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import type {ReactNode} from 'react';

import styles from './index.module.css';

const residents = ['Mira', 'Ivo', 'Nora', 'Sol', 'Elian', 'Toma'];

function TownSignal(): ReactNode {
  return (
    <div className={styles.signal} aria-label="Six residents connected to the Station hearing">
      <div className={styles.signalHeader}>
        <span>Town signal</span>
        <span className={styles.signalStatus}>Hearing pending</span>
      </div>
      <div className={styles.residentGrid}>
        {residents.map((resident, index) => (
          <div className={styles.resident} key={resident}>
            <span className={styles.residentIndex}>{String(index + 1).padStart(2, '0')}</span>
            <span>{resident}</span>
            <span className={styles.pulse} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className={styles.signalFooter}>
        What they saw. What they heard. What they decide.
      </div>
    </div>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="A town that decides what you are"
      description="Dream of One is a first-person social simulation with six LLM-driven residents.">
      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>FIRST-PERSON SOCIAL SIMULATION</p>
            <Heading as="h1">The town is already talking.</Heading>
            <p className={styles.lede}>
              Six residents move, meet, remember, and form their own account of
              you. Change what they believe before the Station hearing decides
              whether you may leave.
            </p>
            <div className={styles.actions}>
              <Link className={clsx('button', styles.primaryAction)} to="/blog/qwen38-max-dream-of-one">
                Read the Qwen3.8 case study
              </Link>
              <Link className={clsx('button', styles.secondaryAction)} to="/docs/overview">
                Read the overview
              </Link>
            </div>
          </div>
          <TownSignal />
        </section>

        <section className={styles.principles} aria-labelledby="principles-title">
          <div>
            <p className={styles.eyebrow}>THE RULE OF THE TOWN</p>
            <Heading as="h2" id="principles-title">The model judges. The runtime keeps it honest.</Heading>
          </div>
          <div className={styles.principleList}>
            <p><strong>Speech has consequences.</strong> Residents remember the words they actually encountered.</p>
            <p><strong>The town keeps moving.</strong> NPCs meet and talk while the player is elsewhere.</p>
            <p><strong>Failure stays visible.</strong> A broken provider call cannot invent speech or a verdict.</p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
