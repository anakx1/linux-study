window.HLW.chapters.push({
  id: 15,
  title: 'Development Tools',
  short: 'Development tools',
  track: 'desktop',
  ref: 'Chapter 15',
  sectionsRef: '15.1–15.6',
  minutes: 40,
  tagline: 'Source code in, executable out.',
  blurb: 'Follow C from source to binary: preprocessing, compiling, linking, libraries and headers, then automate builds with make. Survey lex/yacc, scripting languages and Java.',
  objectives: [
    'Explain the four stages of a C build and the gcc flags that stop at each one.',
    'Compile multiple source files and link against static and shared libraries.',
    'Use headers and include/library search paths correctly.',
    'Write a Makefile with targets, dependencies, variables and phony rules.',
    'Know when to reach for lex/yacc, Python, Perl or Java.'
  ],
  sections: [
    {
      id: 'ch15-compiler',
      ref: '15.1',
      title: 'The C compiler and the build pipeline',
      html: `<p>A C build has four stages. <strong>Preprocessing</strong> expands <code>#include</code>, macros and conditionals. <strong>Compilation</strong> translates C into assembly. <strong>Assembly</strong> produces machine-code object files. <strong>Linking</strong> combines objects and libraries into an executable, resolving symbols and relocations.</p>
      <pre><code>$ gcc -E hello.c -o hello.i    # preprocess only
$ gcc -S hello.c -o hello.s    # compile to assembly
$ gcc -c hello.c -o hello.o    # assemble to object
$ gcc hello.o -o hello         # link
$ gcc -Wall -g hello.c -o hello</code></pre>
      <p><code>-Wall</code> enables common warnings; take them seriously. <code>-g</code> includes debug information for gdb. <code>-O2</code> enables optimisation (which can complicate debugging). <code>-std=c11</code> selects a language standard. The default output is <code>a.out</code> if you omit <code>-o</code>.</p>
      <pre><code>#include &lt;stdio.h&gt;

int main(void) {
    printf("hello, world\\n");
    return 0;
}</code></pre>
      <p>Compilation and linking are separate because it lets you rebuild only changed files and link against libraries without recompiling their source. That separation is the foundation of <code>make</code>.</p>`,
      diagram: {
        type: 'flow',
        caption: 'From source to executable',
        items: [
          { t: 'hello.c', d: 'source' },
          { t: 'Preprocess', d: 'cpp' },
          { t: 'Compile', d: 'cc1 → assembly' },
          { t: 'Assemble', d: 'as → .o' },
          { t: 'Link', d: 'ld + libraries' },
          { t: 'hello', d: 'executable' }
        ]
      }
    },
    {
      id: 'ch15-libraries',
      ref: '15.1.1–15.1.4',
      title: 'Multiple files, libraries and headers',
      html: `<p>Real programs have multiple translation units. Declarations shared between them go in <strong>header files</strong>; definitions go in <code>.c</code> files. Include paths are added with <code>-I</code>; library paths with <code>-L</code>; library names with <code>-l</code>.</p>
      <pre><code>$ gcc -c main.c util.c
$ gcc main.o util.o -o app
$ gcc -I/usr/local/include main.c -L/usr/local/lib -lfoo -o app</code></pre>
      <p><strong>Static libraries</strong> (<code>.a</code>) are archives of object files copied into the executable at link time. <strong>Shared libraries</strong> (<code>.so</code>) are loaded at runtime and can be shared by many processes, which saves memory and allows updates without relinking.</p>
      <pre><code>$ ar rcs libutil.a util.o                 # static archive
$ gcc -fPIC -shared util.c -o libutil.so  # shared library
$ gcc main.c -L. -lutil -o app
$ ldd app                                 # show runtime dependencies
$ sudo ldconfig                           # refresh the linker cache</code></pre>
      <p>The dynamic linker searches <code>/etc/ld.so.cache</code>, standard paths and <code>LD_LIBRARY_PATH</code>. <code>LD_LIBRARY_PATH</code> is a debugging aid, not a deployment strategy: it affects every process and can load the wrong library. Install shared libraries in a standard directory and run <code>ldconfig</code>.</p>
      <p>Headers declare interfaces; they should be self-contained, guarded against multiple inclusion (<code>#ifndef</code>/<code>#define</code> or <code>#pragma once</code>) and free of implementation details. <code>pkg-config</code> can supply the right <code>-I</code> and <code>-l</code> flags for a library.</p>`
    },
    {
      id: 'ch15-make',
      ref: '15.2',
      title: 'make and Makefiles',
      html: `<p><strong>make</strong> reads a <code>Makefile</code> describing targets, prerequisites and recipes. It rebuilds a target only when a prerequisite is newer. This dependency graph is why incremental builds are fast.</p>
      <pre><code>CC      = cc
CFLAGS  = -Wall -g -O2
OBJS    = main.o util.o
TARGET  = app

all: $(TARGET)

$(TARGET): $(OBJS)
\t$(CC) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS)

main.o: main.c util.h
util.o: util.c util.h

clean:
\trm -f $(TARGET) $(OBJS)

.PHONY: all clean</code></pre>
      <p>Rules are <code>target: prerequisites</code> followed by a tab-indented recipe. Automatic variables are essential: <code>$@</code> is the target, <code>$&lt;</code> the first prerequisite, <code>$^</code> all prerequisites. <code>.PHONY</code> marks targets such as <code>all</code> and <code>clean</code> that are not real files.</p>
      <p>make has built-in rules, for example turning <code>.c</code> into <code>.o</code> with <code>$(CC) $(CFLAGS) -c</code>. That means you can omit simple compile rules. Override variables on the command line: <code>make CFLAGS="-O0 -g"</code>. Use <code>make -j4</code> for parallel builds and <code>make -n</code> to preview commands.</p>
      <p>Common conventional targets are <code>all</code>, <code>install</code>, <code>clean</code>, <code>distclean</code>, <code>check</code> and <code>help</code>. A good Makefile is declarative: dependencies are files, not guesses. Missing prerequisites cause stale builds; over-broad prerequisites cause unnecessary rebuilds.</p>`,
      callout: {
        type: 'warn',
        title: 'Tabs are not spaces',
        text: 'Recipes must begin with a tab character, not spaces. This is the most common Makefile error. Editors can display tabs invisibly; configure yours to show them.'
      }
    },
    {
      id: 'ch15-lexyacc',
      ref: '15.3',
      title: 'Lex and Yacc',
      html: `<p><strong>lex</strong> (flex) generates a lexical scanner from regular-expression rules; <strong>yacc</strong> (bison) generates a parser from a grammar. Together they are the classic toolkit for compilers, configuration languages and protocol parsers.</p>
      <pre><code>flex scanner.l    → lex.yy.c
bison parser.y    → parser.tab.c / parser.tab.h
gcc lex.yy.c parser.tab.c -lfl -o parser</code></pre>
      <p>Lex matches the longest rule at the current position and runs its action. Yacc builds an LALR parser from grammar productions and calls semantic actions as rules reduce. Conflicts (shift/reduce, reduce/reduce) are reported at generation time and must be understood, not silenced blindly.</p>
      <p>For many tasks, a hand-written recursive-descent parser or a parser library is simpler and easier to debug. Lex/yacc shine when the grammar is stable, the input is large, and you want a compact declarative specification.</p>`
    },
    {
      id: 'ch15-scripting',
      ref: '15.4–15.5',
      title: 'Scripting languages and Java',
      html: `<p><strong>Python</strong> is the default general-purpose scripting language on most Linux systems. It has a large standard library, clear syntax and excellent tooling. Use a virtual environment (<code>python3 -m venv .venv</code>) to isolate dependencies; do not install project packages into the system Python.</p>
      <pre><code>$ python3 script.py
$ python3 -m venv .venv
$ . .venv/bin/activate
$ pip install requests</code></pre>
      <p><strong>Perl</strong> remains important for text processing and legacy system tooling. Its regular expressions and one-liners are powerful, but readability suffers without discipline. <code>perl -ne 'print if /pattern/' file</code> is a classic filter.</p>
      <p><strong>Java</strong> uses the JDK: <code>javac</code> compiles <code>.java</code> to bytecode, <code>java</code> runs it on the JVM, and <code>jar</code> packages classes. The JVM abstracts the OS, which aids portability but adds runtime and memory overhead. Modern JVM tooling and GraalVM native images reduce that cost.</p>
      <p>Choose the language for the job: shell for orchestration, Python for automation and data, C for low-level control and performance, Go/Rust for modern system services, Java for existing enterprise ecosystems. The operating system does not care, but maintainers do.</p>`
    }
  ],
  commands: [
    { cmd: 'gcc -Wall -g hello.c -o hello', desc: 'Compile a C program with warnings and debug information.' },
    { cmd: 'gcc -E hello.c -o hello.i', desc: 'Run only the preprocessor.' },
    { cmd: 'gcc -c hello.c -o hello.o', desc: 'Compile and assemble to an object file, without linking.' },
    { cmd: 'gcc main.o util.o -o app', desc: 'Link object files into an executable.' },
    { cmd: 'gcc -Iinclude -Llib -lfoo main.c -o app', desc: 'Add include and library search paths and link libfoo.' },
    { cmd: 'ar rcs libutil.a util.o', desc: 'Create a static library archive.' },
    { cmd: 'gcc -fPIC -shared util.c -o libutil.so', desc: 'Build a shared library.' },
    { cmd: 'ldd ./app', desc: 'Show the shared libraries an executable needs at runtime.' },
    { cmd: 'sudo ldconfig', desc: 'Refresh the dynamic linker cache after installing libraries.' },
    { cmd: 'make', desc: 'Build the default target from the Makefile.' },
    { cmd: 'make -j4', desc: 'Run up to four build jobs in parallel.' },
    { cmd: 'make -n', desc: 'Print the commands make would run, without running them.' },
    { cmd: 'python3 -m venv .venv', desc: 'Create an isolated Python virtual environment.' },
    { cmd: 'javac Main.java && java Main', desc: 'Compile and run a Java class.' },
    { cmd: 'flex scanner.l && bison -d parser.y', desc: 'Generate a lexer and parser from grammar files.' }
  ],
  labs: [
    {
      title: 'Compile a multi-file C program',
      goal: 'Practise preprocessing, objects, headers and linking.',
      steps: [
        'Create <code>util.h</code> declaring <code>int add(int, int);</code> and <code>util.c</code> defining it.',
        'Create <code>main.c</code> that includes <code>util.h</code>, calls add and prints the result.',
        'Compile each source separately with <code>gcc -Wall -g -c</code>.',
        'Link the objects into <code>app</code> and run it.',
        'Run <code>gcc -E main.c | head</code> and identify expanded header content.',
        'Use <code>ldd app</code> and explain why libc appears but your own code does not.'
      ]
    },
    {
      title: 'Write and improve a Makefile',
      goal: 'Automate the build and understand dependencies.',
      steps: [
        'Write a Makefile with <code>all</code>, the target, object rules and a <code>clean</code> target. Use tabs for recipes.',
        'Run <code>make</code>, then <code>make</code> again. Why does the second run do nothing?',
        'Touch <code>util.h</code> and run <code>make</code>. Which files rebuild?',
        'Add <code>.PHONY: all clean</code> and verify <code>make clean</code> works even if a file named clean exists.',
        'Try <code>make -n</code> and <code>make -j2</code>. Explain the output.'
      ]
    }
  ],
  cards: [
    { front: 'What are the four stages of a C build?', back: 'Preprocess (#include/macros), compile to assembly, assemble to object code, and link objects/libraries into an executable.' },
    { front: 'What does gcc -c do?', back: 'Compiles and assembles to an object file (.o) but does not link, so unresolved external symbols are allowed.' },
    { front: 'Static vs shared library', back: 'A .a archive is copied into the executable at link time. A .so is loaded at runtime, shared between processes and updatable without relinking.' },
    { front: 'What does -I, -L and -l mean to gcc?', back: '-I adds a header search path, -L adds a library search path, and -l names a library (libfoo.so/.a becomes -lfoo).' },
    { front: 'What are $@, $< and $^ in make?', back: '$@ is the target, $< the first prerequisite, $^ all prerequisites. They avoid repeating filenames in recipes.' },
    { front: 'Why is LD_LIBRARY_PATH discouraged?', back: 'It affects all processes in the environment, can load incompatible libraries, and masks proper installation. Use ldconfig and standard paths instead.' }
  ],
  quiz: [
    {
      q: 'Which gcc flag stops after producing an object file?',
      options: ['-E', '-S', '-c', '-o'],
      answer: 2,
      explain: '-c compiles and assembles to .o without linking. -E preprocesses only; -S stops at assembly source; -o names the output.'
    },
    {
      q: 'What does <code>gcc main.c -L. -lfoo -o app</code> look for?',
      options: [
        'A header named foo.h in the current directory',
        'libfoo.so or libfoo.a in the current directory',
        'A program named foo on PATH',
        'A Makefile named foo'
      ],
      answer: 1,
      explain: '-L. adds the current directory to the library search path; -lfoo searches for libfoo.so or libfoo.a there and in standard paths.'
    },
    {
      q: 'Why does a Makefile recipe need a leading tab?',
      options: [
        'It is cosmetic.',
        'make uses the tab to distinguish recipe lines from variable assignments and rules.',
        'Tabs make builds faster.',
        'It prevents shell expansion.'
      ],
      answer: 1,
      explain: 'The tab is syntactic. Spaces instead of a tab produce a "missing separator" error.'
    },
    {
      q: 'What is a shared library advantage?',
      options: [
        'It is always faster to start.',
        'One copy can be mapped by many processes and updated without relinking every program.',
        'It removes the need for headers.',
        'It cannot have bugs.'
      ],
      answer: 1,
      explain: 'Shared libraries save memory and simplify updates, at the cost of runtime dependency management and potential version conflicts.'
    },
    {
      q: 'Which tool generates a parser from a grammar?',
      options: ['make', 'gcc', 'bison/yacc', 'ldd'],
      answer: 2,
      explain: 'bison (yacc) generates a parser; flex (lex) generates a scanner. make orchestrates the build, gcc compiles, ldd inspects dependencies.'
    }
  ]
});
